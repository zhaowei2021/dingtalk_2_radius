var corpId = window.CONFIG.corpId;
var agentId = window.CONFIG.agentId;
var currentUrl = window.location.href.split('#')[0];
console.log('当前URL:', currentUrl);

// 检查dd对象是否定义
console.log('dd对象:', dd);

var userData = null; // 存储用户数据

// JSAPI配置
dd.config({
    agentId: window.CONFIG.agentId,
    corpId: window.CONFIG.corpId,
    timeStamp: parseInt(window.CONFIG.timestamp),
    nonceStr: window.CONFIG.nonceStr,
    signature: window.CONFIG.signature,
    jsApiList: ['runtime.permission.requestAuthCode']
});

dd.ready(function() {
    console.log('dd.ready执行');
    dd.runtime.permission.requestAuthCode({
        corpId: corpId,
        onSuccess: function(result) {
            console.log('获取到的authCode:', result.code);
            var authCode = result.code;
            // 发送authCode到后端
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ authCode: authCode })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    document.getElementById('user-info').innerText = '登录失败：' + data.error;
                    console.error('登录失败：', data.error);
                } else {
                    // 显示用户信息
                    let userInfo = `
                        <p class="fs-5">欢迎您，${data.name}！</p>
                    `;
                    document.getElementById('user-info').innerHTML = userInfo;
                    console.log('用户详情：', data);

                    // 存储用户数据
                    userData = data;
                }
            })
            .catch(error => {
                document.getElementById('user-info').innerText = '请求失败：' + error;
                console.error('请求失败：', error);
            });
        },
        onFail: function(err) {
            console.error('获取authCode失败：', err);
            document.getElementById('user-info').innerText = '获取authCode失败：' + JSON.stringify(err);
        }
    });
});

dd.error(function(err) {
    console.error('钉钉JSAPI配置错误：', err);
    document.getElementById('user-info').innerText = '钉钉JSAPI配置错误：' + JSON.stringify(err);
});

// 监听表单提交事件
document.getElementById('mac-form').addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表单的默认提交行为

    if (!userData) {
        alert('用户信息未获取，请稍后再试');
        return;
    }

    var macAddress = document.getElementById('mac-address').value.trim();
    if (!macAddress) {
        alert('请输入MAC地址');
        return;
    }

    // 准备要发送的数据
    var postData = {
        name: userData.name,
        userid: userData.userid,
        macAddress: macAddress
    };

    // 发送数据到后端
    fetch('/submit_mac', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(result => {
        // 构建跳转的URL，包含消息和成功状态
        var url = '/result?message=' + encodeURIComponent(result.message || result.error) + '&success=' + result.success;
        window.location.href = url;
    })
    .catch(error => {
        console.error('请求失败：', error);
        var url = '/result?message=' + encodeURIComponent('请求失败：' + error) + '&success=false';
        window.location.href = url;
    });
});
