import logging
import sys
import time
import random
from typing import Tuple
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TextStreamer
from transformers import TextIteratorStreamer
import logging_config
from fastapi import FastAPI
from fastapi.responses import StreamingResponse  # 关键导入
from fastapi.middleware.cors import CORSMiddleware
from threading import Thread
import asyncio
import os
from pydantic import BaseModel

# Setup logging
logger = logging.getLogger(__name__)
model = None
tokenizer = None

def is_gpu_available():
    return torch.cuda.is_available()


def get_base_path():
    # 判断是否是打包后的可执行文件
    if getattr(sys, 'frozen', False):
        # 使用 exe 所在目录作为基础路径
        base_path = os.path.dirname(sys.executable)
    else:
        # 使用脚本所在目录作为基础路径
        base_path = os.path.dirname(os.path.abspath(__file__))
    return base_path

def load_model(model_name) -> Tuple[AutoTokenizer, AutoModelForCausalLM]:
    global model
    global tokenizer
    # Load model and tokenizer
    # model_name = "deepseek-ai/DeepSeek-R1-Distill-Llama-8B"
    # model_name = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"
    # model_name = get_base_path() + "/model/"
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Define the quantization configuration for 8-bit
    quantization_config = BitsAndBytesConfig(
        load_in_8bit=True,
        bnb_4bit_quant_type='nf8',
        bnb_4bit_compute_dtype=torch.float16,
        # bnb_4bit_use_double_quant=True,
        llm_int8_enable_fp32_cpu_offload=True
        # llm_int8_threshold=6.0,
    )

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        load_in_8bit=True,
        device_map="auto",  #! Dynamically balancing between CPU and GPU
        torch_dtype=torch.float16,
        # offload_buffers = True,
        # quantization_config=quantization_config,  #! Quantization
    )

    logger.info(f"Model ({model_name}) loaded.")
    return tokenizer, model


chat_history_k_v = None
generated_responses = []

def generate_chat_response(
    prompt: str,
    tokenizer: AutoTokenizer,
    model: AutoModelForCausalLM,
    streamer: TextStreamer,
    max_length: int = 200,
    temperature: float = 0.7,
    top_k: int = 50,
    top_p: float = 0.9,
) -> str:
    # Add a "thinking" instruction to the prompt
    thinking_prompt = f"""
    问题：{prompt}
    <think>
    请逐步推理问题，不要重复自己的想法。\
    每个步骤都应简洁明了，并按逻辑顺序逐步得出最终答案：
    """
    inputs = tokenizer(thinking_prompt, return_tensors="pt")

    # Move input tensors to the same device as the model
    device = next(model.parameters()).device
    inputs = {key: value.to(device) for key, value in inputs.items()}

    # Start timing the response generation process
    start_time = time.time()

    # Generate logits and outputs
    with torch.no_grad():  # Do not compute grad. descent/no training involved
        logits = model(**inputs).logits
        outputs = model.generate(
            **inputs,
            max_length=500,
            # max_new_tokens=max_length,
            pad_token_id=tokenizer.eos_token_id,
            do_sample=True,  # have multi-options (tokens) picks 1 based on prob.
            streamer = streamer,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            use_cache = True
        )

        logger.debug(
            f"Intermediate logits shape: {logits.shape}"
        )  # Debugging: inspect logits

    # Calculate the time elapsed for thinking
    elapsed_time = time.time() - start_time
    minutes, seconds = divmod(elapsed_time, 60)
    time_str = f"{int(minutes):02}:{int(seconds):02}"

    # Decode the full response
    final_answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    generated_responses.append(final_answer)

    # Log the thinking time and final response
    logger.info(f"Thinking time: {time_str}")
    logger.info(f"Response from generate_chat_response function:\n{final_answer}")

    return final_answer



app = FastAPI()

# 配置 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源（生产环境应指定具体域名）
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
    expose_headers=["*"]
)

@app.get("/ping")
def ping():
    return "pong"

@app.get("/gpu_available")
def get_gpu_state():
    res = is_gpu_available()
    return res

@app.get("/list_local_model")
def list_local_models():
    return {"model_names":[{
        "name":"model",
        "path":"./model/"
    }]}

@app.get("/current_model_name")
def get_current_model_name():
    if not model:
        return ""
    name = model.config.name_or_path
    return name

class AIModelInfoItem(BaseModel):
    name: str

@app.post("/load_model/")
def load_model_by_name(model_info: AIModelInfoItem):
    load_model(model_info.name)
    return True

@app.get("/chat/{question}")
def test(question):
    # tokenizer, model = load_model()
    streamer = TextStreamer(tokenizer)
    final_output = generate_chat_response(
        prompt=question, tokenizer=tokenizer,model=model,streamer=streamer, max_length=300
        )
    return final_output

class ChatItem(BaseModel):
    qustion: str

"""
TODO: 修改为post，因为{prompt}中可能有/之类的字符，导致错误
"""
@app.post("/chat_dynamic")
async def generate_stream(item: ChatItem):
    # tokenizer, model = load_model()
    # 创建流式处理器
    streamer = TextIteratorStreamer(tokenizer, skip_special_tokens=True)

    thinking_prompt = f"""
    问题：{item.qustion}
    <think>
    请逐步推理问题，不要重复自己的想法。\
    每个步骤都应简洁明了，并按逻辑顺序逐步得出最终答案：
    """

    # Tokenize the input prompt
    inputs = tokenizer(thinking_prompt, return_tensors="pt")

    # inputs = tokenizer([prompt], return_tensors="pt")

    # Move input tensors to the same device as the model
    device = next(model.parameters()).device
    inputs = {key: value.to(device) for key, value in inputs.items()}

    # 在独立线程中运行生成
    generation_thread = Thread(
        target=model.generate,
        kwargs={
            **inputs,
            "max_new_tokens": 1000,
            "streamer": streamer,
            "temperature": 0.7
        }
    )
    # Thread(target=generate_chat_response, args=[question, tokenizer, model, streamer,3000,0.7,50,0.9]).start()
    generation_thread.start()

    # 定义异步生成器
    async def text_generator():
        try:
            for text in streamer:  # 同步迭代器需包装为异步
                await asyncio.sleep(1)
                yield text
        finally:
            generation_thread.join()  # 确保线程结束

    # 返回流式响应
    return StreamingResponse(
        text_generator(),
        # media_type="text/plain"
        media_type="text/event-stream",
        headers={
            "Cache-Control":"no-cache",
            "Connection":"keep-alive"
        }
    )

def main():
    # port = random.randint(49152,65535)
    port = 50055
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    import uvicorn

    # 先加载模型，这样端口启动即表示模型加载完成
    print("start load model")
    # load_model("deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B")
    print(get_base_path() + "/model")
    load_model(get_base_path() + "/model")
    print("load model finished")

    uvicorn.run(app, host="0.0.0.0", port=port)
    print("started")

if __name__ == '__main__':
    main()