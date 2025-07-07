var corpId = window.CONFIG.corpId;
var agentId = window.CONFIG.agentId;
var currentUrl = window.location.href.split('#')[0];
console.log('当前URL:', currentUrl);

// 检查dd对象是否定义
console.log('dd对象:', dd);

var userData = null; // 存储用户数据

/**
 * MAC地址格式检查和修复函数
 * @param {string} macInput - 输入的MAC地址字符串
 * @returns {object} - 包含isValid、fixedMac、message的对象
 */
function checkAndFixMacAddress(macInput) {
    if (!macInput || typeof macInput !== 'string') {
        return {
            isValid: false,
            fixedMac: '',
            message: '请输入MAC地址'
        };
    }
    
    // 去除所有空格和制表符
    let cleanMac = macInput.replace(/\s+/g, '').trim();
    
    // 如果输入为空
    if (cleanMac === '') {
        return {
            isValid: false,
            fixedMac: '',
            message: '请输入MAC地址'
        };
    }
    
    // 移除所有非十六进制字符（保留A-F, a-f, 0-9）
    let hexOnly = cleanMac.replace(/[^A-Fa-f0-9]/g, '');
    
    // 检查长度是否为12位（6字节，每字节2位十六进制）
    if (hexOnly.length !== 12) {
        return {
            isValid: false,
            fixedMac: cleanMac,
            message: `MAC地址长度不正确，应为12位十六进制字符，当前为${hexOnly.length}位`
        };
    }
    
    // 转换为大写
    hexOnly = hexOnly.toUpperCase();
    
    // 格式化为标准格式（XX-XX-XX-XX-XX-XX）
    let formattedMac = [];
    for (let i = 0; i < 12; i += 2) {
        formattedMac.push(hexOnly.substr(i, 2));
    }
    let standardMac = formattedMac.join('-');
    
    // 检查是否为有效的MAC地址（不能全为0或全为F）
    if (hexOnly === '000000000000') {
        return {
            isValid: false,
            fixedMac: standardMac,
            message: 'MAC地址不能全为0'
        };
    }
    
    if (hexOnly === 'FFFFFFFFFFFF') {
        return {
            isValid: false,
            fixedMac: standardMac,
            message: 'MAC地址不能全为F（广播地址）'
        };
    }
    
    return {
        isValid: true,
        fixedMac: standardMac,
        message: '格式检查通过'
    };
}

/**
 * 显示格式检查结果
 * @param {object} result - checkAndFixMacAddress函数的返回结果
 */
function displayFormatCheckResult(result) {
    const resultDiv = document.getElementById('format-check-result');
    if (result.isValid) {
        resultDiv.innerHTML = `
            <div class="alert alert-success alert-sm">
                <i class="fas fa-check-circle"></i> ${result.message}
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="alert alert-danger alert-sm">
                <i class="fas fa-exclamation-triangle"></i> ${result.message}
            </div>
        `;
    }
    
    // 3秒后自动隐藏结果
    setTimeout(() => {
        resultDiv.innerHTML = '';
    }, 3000);
}

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

// 格式检查按钮事件监听器
document.getElementById('format-check-btn').addEventListener('click', function() {
    const macInput = document.getElementById('mac-address');
    const macValue = macInput.value;
    
    // 执行格式检查和修复
    const result = checkAndFixMacAddress(macValue);
    
    // 如果格式可以修复，更新输入框的值
    if (result.fixedMac && result.fixedMac !== macValue) {
        macInput.value = result.fixedMac;
        
        // 添加视觉反馈效果
        macInput.classList.add('border-warning');
        setTimeout(() => {
            macInput.classList.remove('border-warning');
            if (result.isValid) {
                macInput.classList.add('border-success');
                setTimeout(() => {
                    macInput.classList.remove('border-success');
                }, 1000);
            }
        }, 500);
    } else if (result.isValid) {
        // 如果格式已经正确，添加成功样式
        macInput.classList.add('border-success');
        setTimeout(() => {
            macInput.classList.remove('border-success');
        }, 1000);
    } else {
        // 如果格式有错误，添加错误样式
        macInput.classList.add('border-danger');
        setTimeout(() => {
            macInput.classList.remove('border-danger');
        }, 2000);
    }
    
    // 显示检查结果
    displayFormatCheckResult(result);
});

// MAC地址输入框实时格式检查
document.getElementById('mac-address').addEventListener('input', function() {
    const macInput = this;
    const macValue = macInput.value;
    
    // 如果输入框为空，清除所有样式和提示
    if (!macValue.trim()) {
        macInput.className = 'form-control form-control-lg';
        document.getElementById('format-check-result').innerHTML = '';
        return;
    }
    
    // 实时检查格式
    const result = checkAndFixMacAddress(macValue);
    
    // 根据检查结果更新输入框样式
    if (result.isValid) {
        macInput.className = 'form-control form-control-lg border-success';
    } else if (macValue.length >= 6) { // 只有当输入了一定长度后才显示错误样式
        macInput.className = 'form-control form-control-lg border-warning';
    } else {
        macInput.className = 'form-control form-control-lg';
    }
});

// 监听表单提交事件
document.getElementById('add-mac-input').addEventListener('click', function() {
    // 获取容器和当前已有的输入框数量
    var container = document.getElementById('mac-inputs-container');
    var inputGroups = container.querySelectorAll('.input-group');
    var newIndex = inputGroups.length + 1;

    // 创建新的输入组
    var newGroup = document.createElement('div');
    newGroup.className = 'input-group mb-2';
    newGroup.innerHTML = `
        <input type="text" class="form-control form-control-lg" name="mac-address-${newIndex}" required>
    `;
    // 在提示文字前插入新输入框
    var formText = container.querySelector('.form-text');
    container.insertBefore(newGroup, formText);
});

document.getElementById('mac-form').addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表单的默认提交行为

    if (!userData) {
        alert('用户信息未获取，请稍后再试');
        return;
    }

    var macAddressInput = document.getElementById('mac-address');
    var macAddress = macAddressInput.value.trim();
    
    if (!macAddress) {
        alert('请输入MAC地址');
        return;
    }

    // 自动检查和修复MAC地址格式
    const formatResult = checkAndFixMacAddress(macAddress);
    
    if (!formatResult.isValid) {
        // 显示错误信息
        displayFormatCheckResult(formatResult);
        alert('MAC地址格式不正确：' + formatResult.message);
        return;
    }
    
    // 如果格式修复了，更新输入框
    if (formatResult.fixedMac !== macAddress) {
        macAddressInput.value = formatResult.fixedMac;
        macAddress = formatResult.fixedMac;
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
