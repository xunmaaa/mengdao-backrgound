import React from 'react';
import { connect, connectAdvanced } from 'react-redux'
import { bindActionCreators } from 'redux'
import globalConfig from 'config';
import ajax from '../../utils/ajax';
import Logger from '../../utils/Logger';
import { message } from 'antd';
import './index.less';
import { loginSuccessCreator } from '../../redux/Login.js';
import { setTimeout } from 'timers';

const logger = Logger.getLogger('Login');

/**
 * 定义Login组件
 */
class Login extends React.PureComponent {
  // login样式: https://colorlib.com/wp/html5-and-css3-login-forms/

  state = {
    userName: 'admin',  // 当前输入的用户名
    password: 'a384b6463fc216a5f8ecb6670f86456a',  // 当前输入的密码
    command: 'login', // post 一起传入的参数
    requesting: false, // 当前是否正在请求服务端接口
    // authList:'',
  };


  handleUsernameInput = (e) => {
    this.setState({ userName: e.target.value });
  };

  handlePasswordInput = (e) => {
    this.setState({ password: e.target.value });
  };

  hide = () => {
    setTimeout(message.destroy(), 3000);
  }

  // 登陆请求回调处理
  handleAfterLogin = (json, param) => {
    let authList = json.data.auths&&json.data.auths.split(':');   //权限标识列表：1,2,3,4...23
    // authList=['1','2','3','4','5','6','7','8','9'];//测试数据
    let { login } = this.props;
    let state = json.state;
    let requesting = this.state.requesting;

    if (state == "1") {
      // 登陆成功
      message.success('登录成功');
      this.hide();
      this.setState({ requesting: false, login: true }, () => {
        console.log("登陆状态:", this.state.login);
      });

      // this.props.handleLoginSuccess(param.userName, json); //传入redux 的值有；userName,responseJson
      this.props.handleLoginSuccess(param.userName, authList); //传入redux 的值有；userName,authListArray
    } else {
      // 登陆失败
      message.error(`登录失败: ${json.msg}, 请联系管理员`);
      this.hide();
      this.setState({ requesting: false });
    }
  }

  // 登陆请求出错处理
  handleAfterLoginFail = (param) => {
    // console.log("handleAfterLoginFail", param);
    message.error("登陆出错");
    logger.error('login error');
    this.hide();
    this.setState({ requesting: false });
  }

  /**
   * 处理表单的submit事件
   *
   * @param e
   */
  handleSubmit = (e) => {  // async可以配合箭头函数
    e.preventDefault();  // 这个很重要, 防止跳转
    this.setState({ requesting: true });

    // 显示正在验证文字,且在请求回来之前,一直显示
    message.loading('正在验证...', 0);
    const userName = this.state.userName;
    const password = this.state.password;
    const command = this.state.command;
    logger.debug('userName = %s, password = %s, command = %s', userName, password, command);

    try {
      // 尝试登陆
      let param = {
        userName: userName,
        password: password,
        command: command
      };
      // fetch('/root/gateway.action?command=login&userName=admin&password=8df63d1f54b38da0e10db1e3de95be63')
      // .then(res=>res.json())
      // .then(res=>{
      //   console.log(res)
      // })
      ajax.login(userName, password, command, this.handleAfterLogin, param, this.handleAfterLoginFail, param);
    } catch (exception) {
      message.error(`网络请求出错: ${exception.message}`);
      logger.error('login error, %o', exception);
      this.hide();
      this.setState({ requesting: false });
    }
  };

  render() {
    return (
      <div id="loginDIV">
        <div className="login">
          <h1>{globalConfig.name}</h1>
          <form onSubmit={this.handleSubmit}>
            <input className="login-input" type="text" value={this.state.userName}
              onChange={this.handleUsernameInput} placeholder="用户名" required="required" />
            <input className="login-input" type="password" value={this.state.password}
              onChange={this.handlePasswordInput} placeholder="密码" required="required" />
            <button className="btn btn-primary btn-block btn-large"
              type="submit" disabled={this.state.requesting}>
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    login: state.Login.login,
    userName: state.Login.userName,
    authList: state.Login.authList,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleLoginSuccess: bindActionCreators(loginSuccessCreator, dispatch),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Login);
