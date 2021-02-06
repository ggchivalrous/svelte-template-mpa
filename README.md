# svelte 多页应用开发模板

配置内容：
- scss
- 自动识别页面 / 手动配置多页信息
- babel 语法降级
- 快捷路径名称 @ => src目录
- 热更新
- 自动识别IP地址
- 自动打开浏览器
- CSS 压缩
- 资源文件处理loader
- 环境变量设置，内置 NODE_ENV，需要添加环境变量请在package文件中的启动命令中添加，在其他文件正常使用即可
- 自动配置时，页面首字母小写处理

## 脚手架

参照`create-react-app`脚手架改出来的一个模板`clone`脚手架

如果不想手动`clone`模板

可以安装看看

**安装**

```shell
npm install db-create-svelte -g
```

**使用**

```shell
db-create-svelte test
```

## 如果模板对您帮助，请给个star