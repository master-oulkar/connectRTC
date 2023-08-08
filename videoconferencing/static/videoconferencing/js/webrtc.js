import * as store from './store_stream.js';
import { updateScreenSharingButton } from './videocall_controls.js';

let userconnection;
let signaling_connection;
let uid = Math.floor((Math.random() * 1000));
var startTime;

const channel_name = document.querySelector('#channel-name').innerHTML;
const localUsername = document.querySelector('#username').innerHTML;

// check internet connection
const showStatus = document.getElementById('status');

const isOnline = window.navigator.onLine;
// true or false

if (isOnline) {
    showStatus.innerText = 'online';
    showStatus.style.color='green';
};

window.addEventListener('offline', (e) => {
    // User is offline
    showStatus.innerText = 'offline';
    showStatus.style.color='red';
});

window.addEventListener('online', (e) => {
    // User is offline
    showStatus.innerText = 'online';
    showStatus.style.color='green';
});


// check device
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
console.log('isMobile device: ', isMobile);

const server = {
    iceServer: [{
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }]
};


if (isMobile) {
    const screenSharingButton = document.getElementById('screen_sharing_button');
    screenSharingButton.style.display = 'none';
    const cameraSwitchButton = document.getElementById('camera_switch_button');
    cameraSwitchButton.style.display = 'block';
};


const getLocalMedia = async () => {

    await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': true,
    })
        .then(localMedia => {
            store.setLocalStrem(localMedia);
            const localUser = document.querySelector('#localuser');
            localUser.srcObject = localMedia;
            console.log('local media devices got connected:', localMedia)
        }).catch(err => {
            console.log('accessing local media devices error: ', err);
        });

    const screenSharingButton = document.getElementById('screen_sharing_button');

    screenSharingButton.addEventListener('click', async () => {
        const screenActive = store.getState().screenSharingActive;
        switchBetweenCameraAndScreenSharing(screenActive);
        console.log('screenActive:', screenActive);
    });

    const changeCameraButton = document.getElementById('camera_switch_button');

    changeCameraButton.addEventListener('click', async () => {
        const cameraActive = store.getState().cameraActive;
        switchCamera(cameraActive);
        console.log('cameraActive:', cameraActive);
    });

    signaling_connection = new WebSocket('wss://' + window.location.host + '/ws/videocall/' + channel_name + '/')

    signaling_connection.addEventListener('error', (event) => {
        alert('websocket connection error:', event)
        window.open('/videocall/', '_self');
    });


    signaling_connection.onopen = () => {
        console.log('websocket connection established');
        signaling_connection.send(JSON.stringify({ 'type': 'ready' }));
    };

    signaling_connection.addEventListener('message', handleMessage);
};


const createUserConnection = () => {
    userconnection = new RTCPeerConnection(server);
    console.log('RTC userconnection established.');
    
    startTime = window.performance.now();

    // add receiving tracks from remote user
    const remoteMedia = new MediaStream();
    store.setRemoteStream(remoteMedia);
    const remoteUser = document.querySelector('#remoteuser');
    remoteUser.srcObject = store.getState().remoteStream;
    userconnection.ontrack = (event) => {
        remoteMedia.addTrack(event.track);
        console.log('remote tracks added to RTC connection:', remoteMedia);
    };

    // add local media
    const localMedia = store.getState().localStream;
    localMedia.getTracks().forEach((track) => {
        userconnection.addTrack(track, localMedia);
        console.log('local tracks added to RTC connection:', localMedia.getVideoTracks()[0]);
    });

    userconnection.onicecandidate = (event) => {
        if (event.candidate) {
            // send ice candidate
            signaling_connection.send(JSON.stringify({
                'uid': uid,
                'type': 'candidate',
                'candidate': event.candidate,
            }));
        };
    };

    userconnection.onconnectionstatechange = (event) => {
        if (userconnection.connectionState === 'connected') {
            console.log('succesfully connected to remote user.')

            const elapsedTime = window.performance.now() - startTime;
            console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
            startTime = null;

            remoteUser.style.display = 'block';
            const videocalremote_gif = document.querySelector('.videocal-remote_gif');
            videocalremote_gif.style.display = 'none';
        } else {
            console.log('remote user disconnected.')
            remoteUser.style.display = 'none';
            const videocalremote_gif = document.querySelector('.videocal-remote_gif');
            videocalremote_gif.style.display = 'block';
        };
    };
};



const handleMessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.message.type) {
        case 'offer':
            if (uid === data.message.uid) {
                return;
            } else {
                document.getElementById('remote-username').innerHTML = data.message.username;
                sendUserAnswer(data.message.offer);
            };
            break;
        case 'answer':
            if (uid === data.message.uid) {
                return;
            } else {
                addAnswer(data.message.answer);
            };
            break;
        case 'candidate':
            if (uid === data.message.uid) {
                return;
            } else {
                addCandidate(data.message.candidate);
            };
            break;
        case 'ready':
            sendUserOffer();
            break;
        case 'hangup':
            if (uid === data.message.uid) {
                return;
            } else {
                closeRemoteVideo();
            };
        default:
            return;
    }
};

const sendUserOffer = async () => {
    createUserConnection();

    store.setLocalUser(userconnection);

    let localuser = store.getState().localUser;

    const offer = await localuser.createOffer();
    await localuser.setLocalDescription(offer);

    signaling_connection.send(JSON.stringify({
        'uid': uid,
        'username': localUsername,
        'type': 'offer',
        'offer': offer,
    }));
};

const sendUserAnswer = async (offer) => {
    createUserConnection();

    store.setRemoteUser(userconnection);

    let remoteuser = store.getState().remoteUser;

    await remoteuser.setRemoteDescription(offer);

    const answer = await remoteuser.createAnswer();

    await remoteuser.setLocalDescription(answer);

    signaling_connection.send(JSON.stringify({
        'uid': uid,
        'type': 'answer',
        'answer': answer,
    }));
};

const addAnswer = (answer) => {
    let localuser = store.getState().localUser;
    localuser.setRemoteDescription(answer);
    console.log('webrtc answer came:', answer)
};

const addCandidate = async (candidate) => {
    console.log('icecandidate:', candidate);
    try {
        await userconnection.addIceCandidate(candidate);

    } catch (error) {
        console.log('error occured while ice candidate:', error);
    }
};

// screen sharing on desktops
let screenSharingStream;

const switchBetweenCameraAndScreenSharing = async (screenSharingActive) => {
    if (screenSharingActive) {
        const localStream = store.getState().localStream;
        let localUser = store.getState().localUser;
        const senders = localUser.getSenders();
        const sender = senders.find((sender) =>
            sender.track.kind === localStream.getVideoTracks()[0].kind);
        if (sender) {
            sender.replaceTrack(localStream.getVideoTracks()[0]);
        };

        // stop screen sharing
        store
            .getState()
            .screenSharingStream
            .getTracks()
            .forEach((track) => {
                track.stop();
            });

        const localVideo = document.querySelector('#localuser');
        localVideo.srcObject = localStream;
        store.setScreenSharingActive(!screenSharingActive);

        updateScreenSharingButton(!screenSharingActive);
    } else {
        console.log('switching to screen sharing');
        try {
            screenSharingStream = await navigator.mediaDevices.getDisplayMedia({ 'audio': false, 'video': true });
            store.setScreenSharingStream(screenSharingStream);
            console.log('screen sharing media:', screenSharingStream.getVideoTracks()[0])
            let localUser = store.getState().localUser;
            const senders = localUser.getSenders();
            console.log('senders:', senders);
            const sender = senders.find((sender) =>
                sender.track.kind === screenSharingStream.getVideoTracks()[0].kind);
            console.log('sender:', sender);
            if (sender) {
                sender.replaceTrack(screenSharingStream.getVideoTracks()[0]);
                console.log('replaced video:', sender)
            };
            const localVideo = document.querySelector('#localuser');
            localVideo.srcObject = screenSharingStream;
            store.setScreenSharingActive(!screenSharingActive);
            updateScreenSharingButton(!screenSharingActive);
        } catch (error) {
            console.log('error in screen sharing:', error)
        }
    }
};

// switch camera on mobile devices
let backCameraStream;
let frontCameraStream;
const switchCamera = async (cameraActive) => {
    if (cameraActive) {
        // stop back camera sharing
        store
            .getState()
            .backCameraStream
            .getTracks()
            .forEach((track) => {
                track.stop();
            });

        frontCameraStream = await navigator.mediaDevices.getUserMedia({ 'audio': true, 'video': { facingMode: 'user' } });
        store.setLocalStrem(frontCameraStream);
        let localUser = store.getState().localUser;
        const senders = localUser.getSenders();
        const sender = senders.find((sender) =>
            sender.track.kind === frontCameraStream.getVideoTracks()[0].kind);
        if (sender) {
            sender.replaceTrack(frontCameraStream.getVideoTracks()[0]);
        };

        const localVideo = document.querySelector('#localuser');
        localVideo.srcObject = frontCameraStream;
        store.setCameraActive(!cameraActive);
        updateMobileCameraButton(!cameraActive);
    } else {
        console.log('switching camera');
        try {
            // stop back camera sharing
            store
                .getState()
                .localStream
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            backCameraStream = await navigator.mediaDevices.getUserMedia({ 'audio': true, 'video': { facingMode: 'environment' } });
            store.setBackCameraStream(backCameraStream);
            let localUser = store.getState().localUser;
            const senders = localUser.getSenders();
            console.log('senders:', senders);
            const sender = senders.find((sender) =>
                sender.track.kind === backCameraStream.getVideoTracks()[0].kind);
            console.log('sender:', sender);
            if (sender) {
                sender.replaceTrack(backCameraStream.getVideoTracks()[0]);
                console.log('replaced video:', sender)
            };
            const localVideo = document.querySelector('#localuser');
            localVideo.srcObject = backCameraStream;
            store.setCameraActive(!cameraActive);
            updateMobileCameraButton(!cameraActive); //this button hase same styling as screen sharing, this function just change color to red button.
        } catch (error) {
            console.log('error camera switching:', error)
        }
    }
};


// leave video call and local stream

let hangupButton = document.querySelector('#hangup_button');
hangupButton.addEventListener('click', () => {

    console.log('send request to peer for hangup')

    userconnection.close();

    const localStream = store.getState().localStream;
    localStream.getTracks().forEach(function (track) {
        track.stop();
    });

    signaling_connection.send(JSON.stringify({
        'uid': uid,
        'type': 'hangup',
    }));

    window.open('/videocall/', '_self');
})

const closeRemoteVideo = () => {
    const remoteUser = document.querySelector('#remoteuser');
    remoteUser.style.display = 'none';
    const videocalremote_gif = document.querySelector('.videocal-remote_gif');
    videocalremote_gif.style.display = 'block';
    document.getElementById('channel-name').style.display = 'none';
    document.querySelector('.videocal-controls').style.opacity = 1;
}

getLocalMedia();

