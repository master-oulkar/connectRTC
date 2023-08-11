let userconnection;
let signaling_connection;
let uid = Math.floor((Math.random() * 1000));
var startTime;
let twilioServers=[];

// button images
const cameraOnImage = "/static/videoconferencing/img/camera.png"
const cameraOffImage = "/static/videoconferencing/img/cameraOff.png"
const micOnImage = "/static/videoconferencing/img/mic.png"
const micOffImage = "/static/videoconferencing/img/micOff.png"
// storage streams
let streams = {
    localStream : null,
    remoteStream : null,
    screenSharingStream: null,
    remoteUser: null,
    localUser: null,
    screenSharingActive : false,
    remoteUsername:null,
    cameraActive: false,
    backCameraStream:null,
};

// channel name and local username
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

// // get server configurations from django
// let iceServers = async () => {
//     await fetch('/turn_server/', {
//         method: 'GET',
//     })
//     .then(response => response.json()
//     )
//     .then(ser => {
//         twilioServers = ser.servers
//         const server = {
//             iceServer: [...twilioServers, {urls:'stun:stun1.l.google.com:19302', url:'stun:stun2.l.google.com:19302'}]
//         }; 
//         console.log(server)
//         return server;
//     })
//     .catch( err => {
//         console.log('iceservers fetching error from twilio:', err)
//     });
// };

 const server = {
            iceServer: [{
                urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']
            }]
        };

// show camera switch button on mobile devices
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
            setLocalStrem(localMedia);
            const localUser = document.querySelector('#localuser');
            localUser.srcObject = localMedia;
            console.log('local media devices got connected:', localMedia)
        }).catch(err => {
            console.log('accessing local media devices error: ', err);
        });

    const screenSharingButton = document.getElementById('screen_sharing_button');

    screenSharingButton.addEventListener('click', async () => {
        const screenActive = getState().screenSharingActive;
        switchBetweenCameraAndScreenSharing(screenActive);
        console.log('screenActive:', screenActive);
    });

    const changeCameraButton = document.getElementById('camera_switch_button');

    changeCameraButton.addEventListener('click', async () => {
        const cameraActive = getState().cameraActive;
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
    setRemoteStream(remoteMedia);
    const remoteUser = document.querySelector('#remoteuser');
    remoteUser.srcObject = getState().remoteStream;
    userconnection.ontrack = (event) => {
        remoteMedia.addTrack(event.track);
        console.log('remote tracks added to RTC connection:', remoteMedia);
    };

    // add local media
    const localMedia = getState().localStream;
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
        } else if (userconnection.connectionState === 'connecting'){
            console.log('remote user connecting.')
        } else {
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

    setLocalUser(userconnection);

    let localuser = getState().localUser;

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

    setRemoteUser(userconnection);

    let remoteuser = getState().remoteUser;

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
    let localuser = streams.localUser;
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
        const localStream = getState().localStream;
        let localUser = getState().localUser;
        const senders = localUser.getSenders();
        const sender = senders.find((sender) =>
            sender.track.kind === localStream.getVideoTracks()[0].kind);
        if (sender) {
            sender.replaceTrack(localStream.getVideoTracks()[0]);
        };

        // stop screen sharing
        streams.screenSharingStream.getTracks().forEach((track) => {track.stop();});

        const localVideo = document.querySelector('#localuser');
        localVideo.srcObject = localStream;
        setScreenSharingActive(!screenSharingActive);

        updateScreenSharingButton(!screenSharingActive);
    } else {
        console.log('switching to screen sharing');
        try {
            screenSharingStream = await navigator.mediaDevices.getDisplayMedia({ 'audio': false, 'video': true });
            setScreenSharingStream(screenSharingStream);
            console.log('screen sharing media:', screenSharingStream.getVideoTracks()[0])
            let localUser = getState().localUser;
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
            setScreenSharingActive(!screenSharingActive);
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
        console.log('switching camera');
        try {
            // stop back camera sharing
            streams.backCameraStream.getTracks().forEach((track) => {track.stop();});
    
            frontCameraStream = await navigator.mediaDevices.getUserMedia({ 'audio': true, 'video': { facingMode: 'user' } });
            setLocalStrem(frontCameraStream);
            let localUser = getState().localUser;
            const senders = localUser.getSenders();
            const sender = senders.find((sender) =>
                sender.track.kind === frontCameraStream.getVideoTracks()[0].kind);
            if (sender) {
                sender.replaceTrack(frontCameraStream.getVideoTracks()[0]);
            };
    
            const localVideo = document.querySelector('#localuser');
            localVideo.srcObject = frontCameraStream;
            setCameraActive(!cameraActive);
            updateMobileCameraButton(!cameraActive);
         } catch (error) {
            console.log('error camera switching:', error)
        }
    } else {
        console.log('switching camera');
        try {
            // stop back camera sharing
            streams.localStream.getTracks().forEach((track) => { track.stop();});

            backCameraStream = await navigator.mediaDevices.getUserMedia({ 'audio': true, 'video': { facingMode: 'environment' } });
            setBackCameraStream(backCameraStream);
            let localUser = getState().localUser;
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
            setCameraActive(!cameraActive);
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

    const localStream = getState().localStream;
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

const cameraButton = document.getElementById('camera_button');
cameraButton.addEventListener('click', () => {
    const localStream = getState().localStream;
    const cameraEnabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !cameraEnabled;
    updateCameraButton(cameraEnabled);
});

const updateCameraButton = (cameraActive) => {
    const cameraButtonImage = document.getElementById('camera_button_image');
    cameraButtonImage.src = cameraActive ? cameraOffImage : cameraOnImage;
    cameraButton.style.background = cameraActive ? 'rgb(240, 61, 61)' : '#04070aea';
}

// event listeners for mic on - off

const micButton = document.getElementById('mic_button');
micButton.addEventListener('click', () => {
    const localStream = getState().localStream;
    const micEnabled = localStream.getAudioTracks()[0].enabled;
    localStream.getAudioTracks()[0].enabled = !micEnabled;
    updateMicButton(micEnabled);
});

const updateMicButton = (micActive) => {
    const micButtonImage = document.getElementById('mic_button_image');
    micButtonImage.src = micActive ? micOffImage : micOnImage;
    micButton.style.background = micActive ? 'rgb(240, 61, 61)' : '#04070aea';
};


// update screen sharing button
const updateScreenSharingButton = (screenActive) => {
    const screenButtonImage = document.getElementById('screen_sharing_button');
    screenButtonImage.style.background = screenActive ? 'rgb(240, 61, 61)' : '#04070aea';
};

// update camera buttons

const updateMobileCameraButton = (screenActive) => {
    const cameraButtonImage = document.getElementById('camera_switch_button');
    cameraButtonImage.style.background = screenActive ? 'rgb(240, 61, 61)' : '#04070aea';
}

// functions for storage purpose
const setBackCameraStream = (stream)=>{
    streams = {
        ...streams,
        backCameraStream: stream,
    };
}

const setCameraActive = (condition)=>{
    streams = {
        ...streams,
        cameraActive: condition,
    };
}

const setRemoteUsername = (username) => {
    streams = {
        ...streams,
        remoteUsername: username,
    };
};

const setLocalStrem = (stream) => {
    streams = {
        ...streams,
        localStream: stream,
    };
};


const setScreenSharingStream = (stream) => {
    streams = {
        ...streams,
        screenSharingStream:stream,
    };
};

const setRemoteStream = (stream)=>{
    streams = {
        ...streams,
        remoteStream:stream,
    };
};

const setLocalUser = (uid) => {
    streams = {
        ...streams,
        localUser: uid,
    };
};

const setRemoteUser = (uid) => {
    streams = {
        ...streams,
        remoteUser: uid,
    };
};

const setScreenSharingActive = (screenSharingActive) => {
    streams = {
        ...streams,
        screenSharingActive: screenSharingActive,
    };
};


const getState = ()=>{
    return streams
};


getLocalMedia();

