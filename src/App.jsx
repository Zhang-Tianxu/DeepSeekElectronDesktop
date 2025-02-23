import React, { useState } from 'react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  RedoOutlined,
  MailOutlined,
  SwapOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { Image, Button, Layout, Menu, theme, Modal,Table } from 'antd';
import { Spin,QRCode, Tooltip } from 'antd'
import "./App.css"
import DeepSeekChat from './components/chat'

const AITableColumns = [
  {
    title:"模型名称",
    dataIndex:"name",
    key:"name"
  },
  {
    title:"硬件要求",
    dataIndex:"require",
    key:"require"
  }
]

const AIModelData = [
  {
    key:'1',
    name:"deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    require:"内存16GB+;独立显卡，显存8GB+。"
  },
  {
    key:'2',
    name:"deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    require:"内存16GB+;独立显卡，显存10GB+。"
  },
  {
    key:'3',
    name:"deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
    require:"内存16GB+;独立显卡，显存12GB+。"
  },
  {
    key:'4',
    name:"deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
    require:"内存32GB+;独立显卡，显存16GB+。"
  },
  {
    key:'5',
    name:"deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    require:"内存64GB+;独立显卡，显存24GB+。"
  },
  {
    key:'6',
    name:"deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
    require:"内128GB+;独立显卡，显存70GB+。"
  },
]


const { Header, Sider, Content } = Layout;
const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [gpuAvailable, setGpuAvailabel] = useState(false);
  const [modelName, setModelName] = useState("")
  const [newModelName, setNewModelName] = useState("")
  const [changeAIModelLoading, setChangeAIModelLoading] = useState(false)
  const [fallbackModelShow, setFallbackModelShow] = useState(false)
  const [aboutSoftwareShow, setAboutSoftwareShow] = useState(false)
  const [changeAIModelShow, setChangeAIModelShow] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  async function updateAIStatus() {
    window.globalVariables.getDeepSeekBackendHost().then((deepSeekHost) => {
      fetch(deepSeekHost + '/gpu_available/').then((gpu_response) => {
        gpu_response.json().then((gpu) => {
          console.log(gpu)
          setGpuAvailabel(gpu)
        })
      })
      fetch(deepSeekHost + '/current_model_name/').then((model_name_response) => {
        model_name_response.json().then((model_name) => {
          setModelName(model_name)
        })
      })
    })
  }
  async function changeAIModel(model_name) {
    const deepSeekHost = await window.globalVariables.getDeepSeekBackendHost()
    console.log(deepSeekHost)

    const response = await fetch(deepSeekHost + '/load_model/', {
      method: "POST",
      headers: {
        'Content-Type': "application/json"
      },
      body: JSON.stringify({ "name": model_name })
    });
  }
  const updateTimer = setTimeout(() => {
    updateAIStatus()
  }, 2000)
  window.clearTimeout(updateTimer)
  //   const response = await fetch('http://localhost:8000/stream/' + userMsg);
  //   const response = await fetch('http://localhost:8002/stream/' + userMsg);
  return (
    <Layout style={{ height: "100%" }}>
      {true && <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={[
            {
              key: '1',
              icon: <SwapOutlined />,
              label: '模型选择',
              onClick: () => {
                setChangeAIModelShow(true)
              }
            },
            {
              key: '2',
              icon: <ProfileOutlined />,
              label: '关于软件',
              onClick: () => {
                setAboutSoftwareShow(true)
              }
            },
            {
              key: '3',
              icon: <MailOutlined />,
              label: '问题反馈',
              onClick: () => {
                setFallbackModelShow(true)
              }
            },
          ]}
        />
      </Sider>}
      <Layout>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: "flex",
            alignItems: "center"
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ display: "flex" }}>
            <div style={{ marginRight: "1rem" }}>
              {gpuAvailable ? "GPU可用" : "GPU不可用，请正确安装驱动"}
            </div>
            <div style={{marginRight:"1rem"}}>
              当前模型：{modelName.length > 0 ? modelName: "模型未加载"}
            </div>
          </div>
          <Tooltip title="刷新模型状态">

          <Button icon={<RedoOutlined></RedoOutlined>} onClick={() => {
            updateAIStatus()
          }}></Button>
          </Tooltip>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            height: "100%",
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <DeepSeekChat></DeepSeekChat>
        </Content>
      </Layout>
      <Modal title="关于软件" closable={false} open={aboutSoftwareShow}
        footer={
          <div><Button type="primary" onClick={() => {
            setAboutSoftwareShow(false)
          }}>确认</Button></div>
        }>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", fontSize:"1.2rem"}}>
            <p>本软件非商用，仅供测试交流</p>
          </div>
          <div style={{display: "flex", width: "100%",alignItems: "center",justifyContent: "center",paddingBottom: "5rem"}}>
            <Image src="icon.png" width={30}></Image><b style={{fontSize:"1.2rem"}}>上海蛙跃科技有限公司</b>
              <a style={{color:"darkgray", fontStyle:"italic", paddingLeft:"1rem"}}>
                  https:://www.wayuekeji.com
              </a>
          </div>
        
        </div>
      </Modal>
      <Modal title="感谢您的反馈" closable={false} open={fallbackModelShow}
        footer={
          <div><Button type="primary" onClick={() => {
            setFallbackModelShow(false)
          }}>确认</Button></div>
        }>
        <div style={{width:"100%", display:"flex", flexDirection:"column", alignItems:"center"}}>

          <QRCode
            errorLevel='M'
            // value='www.wayuekeji.com'
            value='https://wayuekeji.feishu.cn/share/base/form/shrcnn6eAJon46PQa0DVQZiiuTd'
            icon="icon.png"
          ></QRCode>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <p>请用微信扫码（飞书调查问卷）</p>
          </div>
        </div>
      </Modal>
      <Modal title="DeepSeek-R1 模型修改" closable={false} open={changeAIModelShow} onOk={async()=>{
        if(newModelName.length == 0 || newModelName == modelName) {
          return;
        }

        setChangeAIModelLoading(true)
        await changeAIModel(newModelName);
        setChangeAIModelLoading(false)
        setChangeAIModelShow(false)
        updateAIStatus()
      }}
      onCancel={()=>{
        setChangeAIModelShow(false)
      }}
      okText="确认修改"
      cancelText="取消修改"
      okButtonProps={{
        disabled:changeAIModelLoading
      }}
      cancelButtonProps={{
        disabled:changeAIModelLoading
      }}
      >
        {!changeAIModelLoading ?
        (<div>
            <div>
              注意：首次加载模型需要下载，可能需要<b>较长时间</b>，模型越大，下载时间越长，可能超过数小时，<b>请谨慎切换，耐心等待</b>
            </div>
            <div>软件自带deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B模型</div>
        <Table 
        columns={AITableColumns}
        dataSource={AIModelData}
        rowSelection={
            {
                type: 'radio',
                columnWidth: 48,
                onSelect:(record, selected,selectedRows, nativeEvent)=>{
                  if(newModelName == record.name) {
                    return
                  }
                  setNewModelName(record.name)
                }
              }
        }
        pagination={false}
        showHeader={true}
        >

        </Table>
        </div>) :
        (<div>
          <p>模型加载中，可能需要较长时间，请耐心等待……</p>
          <Spin indicator={<LoadingOutlined></LoadingOutlined>} size="large"></Spin>
        </div>)
        }

      </Modal>
    </Layout>
  );
};
export default App;