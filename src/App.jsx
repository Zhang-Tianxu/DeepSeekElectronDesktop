import React, { useState } from 'react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  RedoOutlined,
  UserOutlined,
  MailOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Image, Button, Layout, Menu, theme, Modal } from 'antd';
import { QRCode, Tooltip } from 'antd'
import "./App.css"
import DeepSeekChat from './components/chat'


const { Header, Sider, Content } = Layout;
const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [gpuAvailable, setGpuAvailabel] = useState(false);
  const [modelName, setModelName] = useState("")
  const [fallbackModelShow, setFallbackModelShow] = useState(false)
  const [aboutSoftware, setAboutSoftware] = useState(false)
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
  setTimeout(() => {
    updateAIStatus()
  }, 2000)
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
              icon: <ProfileOutlined />,
              label: '关于软件',
              onClick: () => {
                setAboutSoftware(true)
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
      <Modal title="关于软件" closable={false} open={aboutSoftware}
        footer={
          <div><Button onClick={() => {
            setAboutSoftware(false)
          }}>确认</Button></div>
        }>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", fontSize:"1.2rem"}}>
            <p>本软件非商用，仅供测试交流</p>
          </div>
          <div style={{display: "flex", width: "100%",alignItems: "center",justifyContent: "center",paddingBottom: "5rem"}}>
            <Image src="logo.png" width={30}></Image><b style={{fontSize:"1.2rem"}}>上海蛙跃科技有限公司</b>
              <a style={{color:"darkgray", fontStyle:"italic", paddingLeft:"1rem"}}>
                  https:://www.wayuekeji.com
              </a>
          </div>
        
        </div>
      </Modal>
      <Modal title="感谢您的反馈" closable={false} open={fallbackModelShow}
        footer={
          <div><Button onClick={() => {
            setFallbackModelShow(false)
          }}>确认</Button></div>
        }>
        <div style={{width:"100%", display:"flex", flexDirection:"column", alignItems:"center"}}>

          <QRCode
            errorLevel='M'
            // value='www.wayuekeji.com'
            value='https://wayuekeji.feishu.cn/share/base/form/shrcnn6eAJon46PQa0DVQZiiuTd'
            icon="logo.png"
          ></QRCode>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <p>请用微信扫码（飞书调查问卷）</p>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};
export default App;