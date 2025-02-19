"""
main_chat_wtih_native_code.py

This module loads a local causal language model, generates responses based on user input, 
and logs the thinking process along with the final answer. 

The model is loaded with quantization settings to optimize memory usage and performance 
(32 bits -> 8 bits).

The orchestration of the process is handled by the main function, and individual steps are 
broken down into dedicated functions.
"""

import logging
import os
import time
from typing import Tuple
#from dotenv import load_dotenv
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TextStreamer
from transformers import TextIteratorStreamer
import logging_config
from fastapi import FastAPI
from fastapi.responses import StreamingResponse  # 关键导入
from fastapi.middleware.cors import CORSMiddleware
from threading import Thread
import asyncio

# Setup logging
logger = logging.getLogger(__name__)


def load_model() -> Tuple[AutoTokenizer, AutoModelForCausalLM]:
    """
    Load the model and tokenizer with 8-bit quantization configuration to optimize memory usage
    and inference performance.

    This function loads the model and tokenizer dynamically based on the environment variables.
    It also configures the model for 8-bit quantization, which reduces the memory footprint
    and speeds up inference, with the additional flexibility to control how much of the model
    is quantized via the 'llm_int8_threshold'.

    The quantization is performed using the `BitsAndBytesConfig`:
    - `load_in_8bit=True` ensures that the model weights are loaded in 8-bit precision (INT8),
        reducing the model's memory requirements.
    - `llm_int8_threshold=6.0` specifies a threshold for applying 8-bit quantization.
    Weights with magnitudes larger than this threshold will be quantized to 8-bit precision,
    while smaller weights may remain in higher precision to retain accuracy.

    The model is loaded in a way that allows it to automatically balance between CPU
    and GPU resources.

    Returns:
        Tuple: The tokenizer and model objects.
    """
    #load_dotenv()
    # Load model and tokenizer
    # model_name = "deepseek-ai/DeepSeek-R1-Distill-Llama-8B"
    model_name = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"
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
    """
        Generate a response from the model based on the input prompt.

        Args:
            - prompt (str): The input prompt.
            - tokenizer (AutoTokenizer): The tokenizer to preprocess the input.
            - model (AutoModelForCausalLM): The model used for generating the response.
            - max_length (int): The maximum length of the generated output.
            - temperature (float): The randomness of the output.
            - top_k (int): The number of top token choices.
            - top_p (float): The cumulative probability threshold for nucleus sampling.

        Returns:
            Tuple[str, str]: The thinking steps and the final answer from the model.

    .   #* About temp, top_k, top_p
        Temperature controls the randomness of the generated text, with higher values
        leading to more creative but less coherent output, and lower values resulting
        in more predictable, deterministic responses.

        Top-k limits token choices to the top k most likely options, reducing irrelevant
        text but potentially limiting creativity.

        Top-p (nucleus sampling) selects tokens dynamically until a cumulative probability
        threshold is met, balancing diversity and coherence, often used in combination
        with top-k.
    """

# Add a "thinking" instruction to the prompt
    thinking_prompt = f"""
    Question: {prompt}
    <think>
    Please reason through the problem step by step without repeating yourself. \
Each step should be concise and progress logically toward the final answer:
    """

    # Tokenize the input prompt
    inputs = tokenizer(thinking_prompt, return_tensors="pt")
    # new_prompt = f"User:{prompt}\nAI:"
    # Tokenize the input prompt
    # inputs = tokenizer(new_prompt, return_tensors="pt")

    # 将新输入加入到对话历史中
    # inputs = torch.cat([chat_history, inputs], dim=-1) if chat_history is not None else inputs
    # print(chat_history)

    # Move input tensors to the same device as the model
    device = next(model.parameters()).device
    inputs = {key: value.to(device) for key, value in inputs.items()}

    # Start timing the response generation process
    start_time = time.time()

    # Generate logits and outputs
    with torch.no_grad():  # Do not compute grad. descent/no training involved
        logits = model(**inputs).logits
        outputs = model.generate(
            # inputs.input_ids,
            **inputs,
            max_length=500,
            # max_new_tokens=max_length,
            pad_token_id=tokenizer.eos_token_id,
            # past_key_values=chat_history_k_v,
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

    # chat_history_k_v = outputs.past_key_values
    # print(chat_history_k_v)
    # Decode the full response
    final_answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # print(final_answer)
    # final_answer = final_answer.split('AI:')[-1].strip()
    # print(final_answer)
    generated_responses.append(final_answer)

    # Log the thinking time and final response
    logger.info(f"Thinking time: {time_str}")
    logger.info(f"Response from generate_chat_response function:\n{final_answer}")

    return final_answer


def main():
    """Orchestrate the loop"""
    print("Chat with DeepSeek R1! Type 'exit' to end the chat.")

    # Load the model and tokenizer
    tokenizer, model = load_model()

    #tokenizer = AutoTokenizer.from_pretrained("./model/")
    #model = AutoModelForCausalLM.from_pretrained("./model/")

    streamer = TextStreamer(tokenizer)

    # 设置 pad_token 为 eos_token
    #tokenizer.pad_token = tokenizer.eos_token
    #model.config.pad_token_id = tokenizer.pad_token_id

    while True:
        user_input = input("\nYou: ")
        if user_input.lower() == "exit":
            break

        # Generate and display the response
        final_output = generate_chat_response(
            prompt=user_input, tokenizer=tokenizer,model=model,streamer=streamer, max_length=3000
        )
        print(f"DeepSeek (Final Answer): {final_output}")
        logger.info(f"Response: {final_output}")


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

@app.get("/chat/{question}")
def test(question):
    tokenizer, model = load_model()
    streamer = TextStreamer(tokenizer)
    final_output = generate_chat_response(
        prompt=question, tokenizer=tokenizer,model=model,streamer=streamer, max_length=300
        )
    return final_output

# 结合异步生成器
@app.get("/chat2/{question}")
async def async_generator(question):
    tokenizer, model = load_model()
    #streamer = TextIteratorStreamer(tokenizer)
    streamer = TextStreamer(tokenizer)

    # Tokenize the input prompt
    inputs = tokenizer(question, return_tensors="pt")

    # Move input tensors to the same device as the model
    device = next(model.parameters()).device
    inputs = {key: value.to(device) for key, value in inputs.items()}

    #Thread(target=model.generate,
    #        kwargs={**inputs,"max_length":3000, "do_sample":True,"streamer": streamer, "temperature":0.7, "top_k":50, "top_p":0.9}).start()
    Thread(target=generate_chat_response, args=[question, tokenizer, model, streamer,3000,0.7,50,0.9]).start()
    async for token in streamer:
        yield token

@app.get("/stream/{prompt}")
async def generate_stream(prompt: str):
    tokenizer, model = load_model()
    # 创建流式处理器
    streamer = TextIteratorStreamer(tokenizer, skip_special_tokens=True)

    thinking_prompt = f"""
    Question: {prompt}
    <think>
    Please reason through the problem step by step without repeating yourself. \
Each step should be concise and progress logically toward the final answer:
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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)