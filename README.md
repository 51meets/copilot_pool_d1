# Copilot_pool

​		**copilot_pool是一个集成了多个功能的项目，通过CloudFlare搭建的Worker实现允许通过电子邮件邀请用户加入GitHub组织，并为特定用户开通GitHub Copilot功能、Copilot2Api功能以及TelegramBot消息提醒功能，并且提供ghp池、ghu池为项目实现持续化发展。**

# 开始

​		**这些说明将帮助你获取Copilot的副本，并在你的本地机器上运行起来，用于开发和测试目的。请参阅部署部分。**

### 免责声明

​		**本工具仅供学习和技术研究使用，不得用于任何商业或非法行为，否则后果自负。**

### 先决条件

​		**在开始之前，确保你已具备一定的worker、telegram-bot等基础知识。**

### 部署

- #### 创建Worker

  **使用提供Worker.js源码直接部署。并修改相关参数**

  ```
  // 定义接受消息用户
  var user = '';
  // 定义telegram机器人的token
  var telegramToken = '';
  // 是否开启Telegram消息通知
  var isTelegram = true;
  ```

- #### 创建D1数据库

  **操作流程：Workers & Pages -> D1 -> Create database -> Dashboard**

  **Dashboard：**

  **参数说明：Database name 【数据库名称 可随意】**

​		**图片操作：**

​			详见论坛：https://linux.do/t/topic/29998/31 

​	**至此数据库创建完成**

- #### 创建表结构

  **操作流程：Create table -> Create**

  **Create：**

  **参数说明：**

  **Table Name**【表名】

  **Column Name** 【字段名】

  **Type** 【字段类型】

  **Default Value**【默认值】

  **Primary Key**【主键】

  **图片流程：**

  ​	详见论坛：https://linux.do/t/topic/29998/31 

  **相关表结构：**

  ```sql
CREATE TABLE ghu_pool (
    token TEXT PRIMARY KEY,
    create_date DATE DEFAULT CURRENT_DATE
  );
  
  CREATE TABLE organization (
    name TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    create_date DATE DEFAULT CURRENT_DATE
  );
  CREATE UNIQUE INDEX idx_token ON organization(token);
  
  CREATE TABLE contribution (
    name TEXT PRIMARY KEY,
    total integer DEFAULT 1,
    create_date DATE DEFAULT CURRENT_DATE
  );
  
  ```
  
  **至此表结构创建完成。**

- #### 绑定数据库

  **前置条件：已完成创建Worker**

  **操作步骤：Settings -> Variables -> D1 Database Bindings -> Add binding**

  **D1 Database Bindings 参数说明：**

  **Variable name：变量名称 必须为 DB**

  **D1 Database：D1数据库名称**

  **注意事项：Variable name 必须为 DB、D1 Database 绑定的数据库为第二步创建的数据库**

  **图片流程：**

   	详见论坛：https://linux.do/t/topic/29998/31 

- #### 相关API

  邀请Github用户

```
curl --location --request POST ‘https://domain/inviteUser?email=’
参数说明：
	email：邮箱 【必填】
```

​		copilot2api

```
curl --location ‘https://domain/v1/chat/completions’
–header ‘Authorization: Bearer ghu_pool’
–header ‘Content-Type: application/json’
–data ‘{
“model”: “gpt-4”,
“messages”: [
{
“role”: “user”,
“content”: “hi”
}
]
}’
```

​		上传密钥

```
curl --location ‘https://domain/upload’
–header ‘Content-Type: application/json’
–data ‘{
“user”:“”,
“name”:“”,
“token”:[""],
“type”:“”
}’

参数说明：
	user：贡献者名称 【必填】
	name：组织名称 【type=organization 必填】
	token：ghu或者ghp集合 【必填】
	type：上传类型 【必填】 organization 【组织】 | user 【用户】 
```

​		贡献榜Top10

```
curl --location ‘https://domain/contribution/list
```

