async function getKeyAndIv() {
    const response = await fetch('/get-ki');
    return response.json();
}

async function en(textToEncrypt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(textToEncrypt);

    const keyBuffer = new Uint8Array(localStorage.getItem('aesKey').match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
    const ivBuffer = new Uint8Array(localStorage.getItem('aesIv').match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-CBC",
        true,
        ["encrypt", "decrypt"]
    );

    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: ivBuffer
        },
        key,
        data
    );

    return btoa(String.fromCharCode.apply(null, new Uint8Array(encryptedData)));
}

async function de(base64String) {
    const encryptedData = new Uint8Array(atob(base64String).split('').map(char => char.charCodeAt(0)));
    const keyBuffer = new Uint8Array(localStorage.getItem('aesKey').match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
    const ivBuffer = new Uint8Array(localStorage.getItem('aesIv').match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-CBC",
        true,
        ["encrypt", "decrypt"]
    );

    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: ivBuffer
        },
        key,
        encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
}

document.addEventListener('DOMContentLoaded', async () => {
    const { key, iv } = await getKeyAndIv();

    localStorage.setItem('aesKey', key);
    localStorage.setItem('aesIv', iv);
});

const ws = new WebSocket('ws://' + location.host);

ws.onmessage = async function (event) {

    const message = JSON.parse(event.data);

    // console.log('Received message:', message)
    if (message.type === 'text-update') {
        const textarea = document.getElementById('sharedTextarea');
        textarea.focus();

        textarea.value = await de(message.content);
        // 更新光标位置
        textarea.selectionStart = message.selectionStart;
        textarea.selectionEnd = message.selectionEnd;
    } else if (message.type === 'user-event') {
        // 用户连接或断开连接的事件
        console.log('User event:', message.event, 'Current user count:', message.userCount);
        document.getElementById('count').innerText = message.userCount + '人在线';
    }
};

ws.onclose = function () {
    console.log('WebSocket connection closed');
    document.getElementById('count').innerText = '已离线';
};

async function sendUpdate() {
    const textarea = document.getElementById('sharedTextarea');
    const content = await en(textarea.value,)
    const message = {
        type: 'text-update',
        content,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd
    };
    ws.send(JSON.stringify(message));
}

const dSendUpdate = _.debounce(sendUpdate, 500)

document.getElementById('sharedTextarea').addEventListener('input', dSendUpdate);
document.getElementById('sharedTextarea').addEventListener('mouseup', dSendUpdate);
document.getElementById('sharedTextarea').addEventListener('keyup', dSendUpdate);
