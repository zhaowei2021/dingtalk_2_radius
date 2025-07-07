#!/usr/local/python310/bin/python3
# -*- coding:utf-8 -*-

from flask import Flask, request, jsonify, render_template, redirect, url_for
import requests
import time
import logging
import hashlib
import random
import string
import mysql.connector
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 应用凭证和配置信息
APP_KEY = 'dingvvodptvy5roj7t0v'
APP_SECRET = 'CtwWrCDNYh4oBn2zLzjBXem0-1_aI5BBAo87rREEGzPhoCC1YYqqewQGsQ4ZoL6f'
CORP_ID = 'ding5508a57fabe2671a35c2f4657eb6378f'
AGENT_ID = '3264546306'  # 请替换为您的AgentId

# 配置日志
logging.basicConfig(level=logging.DEBUG)

# 全局缓存access_token及其过期时间
access_token_cache = {
    'token': '',
    'expires_at': 0
}

# 全局缓存jsapi_ticket及其过期时间
jsapi_ticket_cache = {
    'ticket': '',
    'expires_at': 0
}

def get_access_token(app_key, app_secretssssss):
    """
    获取Access Token，并进行缓存
    """
    current_time = int(time.time())
    if access_token_cache['expires_at'] > current_time:
        logging.debug("使用缓存的Access Token")
        return access_token_cache['token']

    logging.debug("请求新的Access Token")
    url = 'https://oapi.dingtalk.com/gettoken'
    params = {
        'appkey': app_key,
        'appsecret': app_secret
    }
    response = requests.get(url, params=params)
    data = response.json()
    logging.debug(f"Access Token响应: {data}")
    if data.get('errcode') == 0:
        access_token = data['access_token']
        # 假设token有效期为7200秒，提前200秒过期
        expires_in = data.get('expires_in', 7200) - 200
        access_token_cache['token'] = access_token
        access_token_cache['expires_at'] = current_time + expires_in
        return access_token
    else:
        raise Exception(f"获取access_token失败：{data.get('errmsg')}")

def get_jsapi_ticket(access_token):
    """
    获取JSAPI Ticket，并进行缓存
    """
    current_time = int(time.time())
    if jsapi_ticket_cache['expires_at'] > current_time:
        logging.debug("使用缓存的JSAPI Ticket")
        return jsapi_ticket_cache['ticket']

    logging.debug("请求新的JSAPI Ticket")
    url = 'https://oapi.dingtalk.com/get_jsapi_ticket'
    params = {
        'access_token': access_token
    }
    response = requests.get(url, params=params)
    data = response.json()
    logging.debug(f"JSAPI Ticket响应: {data}")
    if data.get('errcode') == 0:
        ticket = data['ticket']
        # 假设ticket有效期为7200秒，提前200秒过期
        expires_in = data.get('expires_in', 7200) - 200
        jsapi_ticket_cache['ticket'] = ticket
        jsapi_ticket_cache['expires_at'] = current_time + expires_in
        return ticket
    else:
        raise Exception(f"获取jsapi_ticket失败：{data.get('errmsg')}")

def get_user_info(access_token, auth_code):
    """
    使用authCode获取用户的userId
    """
    logging.debug(f"使用authCode获取用户信息，authCode: {auth_code}")
    url = 'https://oapi.dingtalk.com/topapi/v2/user/getuserinfo'
    params = {
        'access_token': access_token
    }
    json_data = {
        'code': auth_code
    }
    response = requests.post(url, params=params, json=json_data)
    data = response.json()
    logging.debug(f"用户信息响应: {data}")
    if data.get('errcode') == 0:
        return data['result']['userid']
    else:
        raise Exception(f"获取用户ID失败：{data.get('errmsg')}")

def get_user_detail(access_token, user_id):
    """
    获取用户的详细信息
    """
    logging.debug(f"获取用户详情，user_id: {user_id}")
    url = 'https://oapi.dingtalk.com/topapi/v2/user/get'
    params = {
        'access_token': access_token
    }
    json_data = {
        'userid': user_id
    }
    response = requests.post(url, params=params, json=json_data)
    data = response.json()
    logging.debug(f"用户详情响应: {data}")
    if data.get('errcode') == 0:
        return data['result']
    else:
        raise Exception(f"获取用户详情失败：{data.get('errmsg')}")

@app.route('/')
def index():
    # 生成JSAPI配置参数
    current_url = request.url
    logging.debug(f"当前URL: {current_url}")
    access_token = get_access_token(APP_KEY, APP_SECRET)
    jsapi_ticket = get_jsapi_ticket(access_token)
    nonceStr = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    timestamp = str(int(time.time()))
    params = {
        'jsapi_ticket': jsapi_ticket,
        'noncestr': nonceStr,
        'timestamp': timestamp,
        'url': current_url.split('#')[0]
    }
    sorted_params = '&'.join([f'{key}={params[key]}' for key in sorted(params)])
    signature = hashlib.sha1(sorted_params.encode('utf-8')).hexdigest()

    return render_template('index.html',
                           corp_id=CORP_ID,
                           agent_id=AGENT_ID,
                           timestamp=timestamp,
                           nonceStr=nonceStr,
                           signature=signature)

@app.route('/login', methods=['POST'])
def login():
    auth_code = request.json.get('authCode')
    logging.debug(f"收到authCode: {auth_code}")
    if not auth_code:
        logging.error('请求中缺少authCode')
        return jsonify({'error': '缺少authCode'}), 400
    try:
        # 获取Access Token
        access_token = get_access_token(APP_KEY, APP_SECRET)
        logging.debug(f"Access Token: {access_token}")

        # 获取用户userId
        user_id = get_user_info(access_token, auth_code)
        logging.debug(f"用户ID: {user_id}")

        # 获取用户详细信息
        user_detail = get_user_detail(access_token, user_id)
        logging.debug(f"用户详情: {user_detail}")

        # 返回用户信息给前端
        return jsonify(user_detail)

    except Exception as e:
        logging.error(f"发生异常：{e}")
        return jsonify({'error': str(e)}), 400

@app.route('/submit_mac', methods=['POST'])
def submit_mac():
    data = request.json
    name = data.get('name')
    userid = data.get('userid')
    mac_address = data.get('macAddress')

    if not all([name, userid, mac_address]):
        return jsonify({'error': '缺少必要的参数', 'success': False}), 400

    # 对 mac_address 进行处理：将小写字母转换为大写，将冒号替换为短横线
    mac_address = mac_address.upper().replace(':', '-')

    try:
        # 连接到数据库（请替换为您的实际数据库信息）
        connection = mysql.connector.connect(
            host='private-mysql-it.volcano-force.com',       # 数据库主机
            database='wifi',   # 数据库名称
            user='root',       # 数据库用户名
            password='duapxOEZ1LW@jira',# 数据库密码
            charset='utf8mb3'
        )
        cursor = connection.cursor()

        # 插入数据到 radcheck 表中
        insert_radcheck_query = """
        INSERT INTO radcheck (username, attribute, value)
        VALUES (%s, %s, %s)
        """
        cursor.execute(insert_radcheck_query, (mac_address, 'Auth-Type', 'Accept'))

        # 插入数据到 userinfo 表中
        insert_userinfo_query = """
        INSERT INTO userinfo (username, firstname)
        VALUES (%s, %s)
        """
        cursor.execute(insert_userinfo_query, (mac_address, name))
        connection.commit()

        # 关闭数据库连接
        cursor.close()
        connection.close()

        # 在成功插入数据后，返回一个成功标志
        return jsonify({'message': '登记成功！', 'success': True}), 200

    except mysql.connector.IntegrityError as err:
        if err.errno == 1062:
            logging.error(f"主键冲突：{err}")
            return jsonify({'error': 'Mac地址已存在，如无法连接WiFi，ios设备请关闭私有地址，安卓设备请设置为使用设备mac！', 'success': False}), 400
        else:
            logging.error(f"数据库完整性错误：{err}")
            return jsonify({'error': '数据库完整性错误', 'success': False}), 500
    except mysql.connector.Error as err:
        logging.error(f"数据库操作失败：{err}")
        return jsonify({'error': '数据库操作失败', 'success': False}), 500
    except Exception as e:
        logging.error(f"发生异常：{e}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/result')
def result():
    # 从查询参数中获取提交结果信息
    message = request.args.get('message', '未知错误')
    success = request.args.get('success', 'false').lower() == 'true'

    return render_template('result.html', message=message, success=success)

if __name__ == '__main__':
    app.run(port=8008, host='0.0.0.0', debug=True)
