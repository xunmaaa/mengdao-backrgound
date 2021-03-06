import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Menu, Icon } from 'antd';
import Logo from '../Logo';
import Logger from '../../utils/Logger';
import items from 'menu.js';  // 由于webpack中的设置, 不用写完整路径
import sideBar from 'sideBarManager.js';   //侧边栏显示管理
import globalConfig from 'config.js';
import './index.less';
import { sidebarCollapseCreator } from '../../redux/Sidebar.js';

const SubMenu = Menu.SubMenu;
const MenuItem = Menu.Item;

const logger = Logger.getLogger('Sidebar');

/**
 * 定义sidebar组件
 */
class Sidebar extends React.PureComponent {

  state = {
    openKeys: ['userManagement', 'playerManagement', 'gameManagement',],  // 当前有哪些submenu被展开
  };

  /**
   * 将菜单项配置转换为对应的MenuItem组件
   * @param obj sidebar菜单配置项
   * @param paths 父级目录, array
   * @returns {XML}
   */
  transFormMenuItem(obj, paths, isLevel1) {
    const parentPath = paths.join('/');   // 将各级父目录组合成完整的路径
    logger.debug('transform %o to path %s', obj, parentPath);

    return (
      <MenuItem key={obj.key} style={{ margin: '0px' }}>
        {obj.icon && <Icon type={obj.icon} />}
        {/*对于level1的菜单项, 如果没有图标, 取第一个字用于折叠时显示*/}
        {isLevel1 && !obj.icon && <span className="invisible-nav-text">{obj.name[0]}</span>}
        <Link to={`/${parentPath}`} style={{ display: 'inline' }}><span className="nav-text">{obj.name}</span></Link>
      </MenuItem>
    );
  }

  // 在每次组件挂载的时候parse一次菜单, 不用每次render都解析
  // 其实这个也可以放在constructor里
  componentWillMount() {
    const paths = [];  // 暂存各级路径, 当作stack用
    const level1KeySet = new Set();  // 暂存所有顶级菜单的key
    const level2KeyMap = new Map();  // 次级菜单与顶级菜单的对应关系

    //依照authlist对item进行过滤，获取符合条件的用户权限列表
    let {authList} = this.props;
    let isAnounceOpen = 0;   //发送公告开启标识
    let anounceChild;        //公告中的发送公告
    for( let i = 0;i<items.length;i++){
      let child = items[i].child;
      let filteredChild = []; //权限单项菜单
      for(let j = 0;j<child.length;j++){
        //发送公告显示判断(对应authindex=10/8,当两者都显示的时候才显示公告管理页签)
        // if(child[j].authIndex==10||child[j].authIndex==8){
          // if(authList.indexOf(child[j].authIndex)>-1){
          //   isAnounceOpen++
          // }
          // let k = j;
          if(child[j].authIndex==10){     
            anounceChild =child[j];  //公告页签
            if((authList.indexOf('10')>-1)&&(authList.indexOf('8')>-1)){     //权限8：发送系统跑马灯
              filteredChild.push(anounceChild)
            }
          // }
          // if(isAnounceOpen==2){
          //   filteredChild.push(anounceChild)
          // }

          // if(authList.indexOf(10)&&authList.indexOf(8)&&anounceChild){
          //   filteredChild.push(anounceChild)
          // }
        }else{
          if(authList.indexOf(child[j].authIndex)>-1){
            filteredChild.push(child[j])
          }
        }
      }
      // console.log("filteredChild:", filteredChild);
      items[i].child = filteredChild;
    }

    // console.log("filterediitems:",items);
    

    // 菜单项是从配置中读取的, parse过程还是有点复杂的
    // map函数很好用
    const menu = items.map(level1 => {
      // parse一级菜单
      paths.push(level1.key);
      level1KeySet.add(level1.key);
      // if (this.state.openKeys.length === 0) {   //当没有展开的子菜单时候，默认展示第一个，这里用这个功能
      //   this.setState({ openKeys: [...this.state.openKeys, items[0].key] })
      // }

      // 是否有子菜单?
      if (level1.child) {
        const level2menu = level1.child.map(level2 => {
          // parse二级菜单
          paths.push(level2.key);
          level2KeyMap.set(level2.key, level1.key);

          if (level2.child) {
            const level3menu = level2.child.map(level3 => {
              // parse三级菜单, 不能再有子菜单了, 即使有也会忽略
              paths.push(level3.key);
              const tmp = this.transFormMenuItem(level3, paths);
              paths.pop();
              return tmp;
            });

            paths.pop();

            return (
              <SubMenu key={level2.key}
                title={level2.icon ? <span><Icon type={level2.icon} />{level2.name}</span> : level2.name}>
                {level3menu}
              </SubMenu>
            );

          } else {
            const tmp = this.transFormMenuItem(level2, paths);
            paths.pop();
            return tmp;
          }
        });

        paths.pop();

        let level1Title;
        // 同样, 如果没有图标的话取第一个字
        if (level1.icon) {
          level1Title = <span><Icon type={level1.icon} /><span className="nav-text">{level1.name}</span></span>;
        } else {
          level1Title = <span><span className="invisible-nav-text">{level1.name[0]}</span><span
            className="nav-text">{level1.name}</span></span>;
        }

        return (
          <SubMenu key={level1.key} title={level1Title}>
            {level2menu}
          </SubMenu>
        )
      }
      // 没有子菜单, 直接转换为MenuItem
      else {
        const tmp = this.transFormMenuItem(level1, paths, true);
        paths.pop();  // return之前别忘了pop
        return tmp;
      }
    });

    this.menu = menu;
    this.level1KeySet = level1KeySet;
    this.level2KeyMap = level2KeyMap;
  }

  // 我决定在class里面, 只有在碰到this问题时才使用箭头函数, 否则还是优先使用成员方法的形式定义函数
  // 因为用箭头函数ESlint总是提示语句最后少一个分号...
  // 事件处理的方法统一命名为handleXXX

  /**
   * 处理子菜单的展开事件
   *
   * @param openKeys
   */
  handleOpenChange = (openKeys) => {
    // 如果当前菜单是折叠状态, 就先展开
    if (this.props.collapse) {
      this.props.handleClickCollapse();
    }

    if (!globalConfig.sidebar.autoMenuSwitch) {  // 不开启这个功能
      this.setState({ openKeys });
      return;
    }

    logger.debug('old open keys: %o', openKeys);
    const newOpenKeys = [];

    // 有没有更优雅的写法
    let lastKey = '';  // 找到最近被点击的一个顶级菜单, 跟数组中元素的顺序有关
    for (let i = openKeys.length; i >= 0; i--) {
      if (this.level1KeySet.has(openKeys[i])) {
        lastKey = openKeys[i];
        break;
      }
    }
    // 过滤掉不在lastKey下面的所有子菜单
    for (const key of openKeys) {
      const ancestor = this.level2KeyMap.get(key);
      if (ancestor === lastKey) {
        newOpenKeys.push(key);
      }
    }
    newOpenKeys.push(lastKey);

    logger.debug('new open keys: %o', newOpenKeys);
    this.setState({ openKeys: newOpenKeys });
  };

  /**
   * 处理"叶子"节点的点击事件
   *
   * @param key
   */
  handleSelect = ({ key }) => {
    if (this.props.collapse) {
      this.props.handleClickCollapse();
    }
    // 如果是level1级别的菜单触发了这个事件, 说明这个菜单没有子项, 需要把其他所有submenu折叠
    if (globalConfig.sidebar.autoMenuSwitch && this.level1KeySet.has(key) && this.state.openKeys.length > 0) {
      this.setState({ openKeys: [] });
    }
  };

  render() {
    return (
      <aside className={this.props.collapse ? "ant-layout-sidebar-collapse" : "ant-layout-sidebar"}>
        <Logo collapse={this.props.collapse} />
        <Menu theme="dark" mode="inline"
          onOpenChange={this.handleOpenChange}
          onSelect={this.handleSelect}
          openKeys={this.props.collapse ? [] : this.state.openKeys}>
          {this.menu}
        </Menu>
        <div className="ant-layout-sidebar-trigger" onClick={this.props.handleClickCollapse}>
          <Icon type={this.props.collapse ? "right" : "left"} />
        </div>
      </aside>
    );
  }

}

// 什么时候使用箭头函数?
// 1. 碰到this问题的时候
// 2. 要写function关键字的时候

const mapStateToProps = (state) => {
  return {
    collapse: state.Sidebar.collapse,
    authList: state.Login.authList,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    // 所有处理事件的方法都以handleXXX命名
    handleClickCollapse: bindActionCreators(sidebarCollapseCreator, dispatch),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Sidebar);
