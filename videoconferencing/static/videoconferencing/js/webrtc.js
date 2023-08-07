// event listeners for camera on - off
const cameraOnImage = "/static/videoconferencing/img/camera.png"
const cameraOffImage = "/static/videoconferencing/img/cameraOff.png"
const micOnImage = "/static/videoconferencing/img/mic.png"
const micOffImage = "/static/videoconferencing/img/micOff.png"

let userconnection;
let signaling_connection;
let uid =  Math.floor((Math.random() * 1000));

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

let streams = {
    localStream : null,
    remoteStream : null,
    screenSharingStream: null,
    remoteUser: null,
    localUser: null,
    screenSharingActive : false,
    remoteUsername:null,
    isMobile: false,
};


const server = {
    iceServer: [{
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }]
}


const channel_name = document.querySelector('#channel-name').innerHTML;
const localUsername = document.querySelector('#username').innerHTML;

const getLocalMedia = async ()=>{

    if (isMobile) {
        const screenSharingButton = document.getElementById('screen_sharing');
        
        screenSharingButton.addEventListener('click', async ()=>{
            setIsMobile(!ismobile);
        });
        const constraints = {'audio': true, 
                            'video': {facingMode: isMobile ? "environment":"user" },
                             };
    }else{
        const constraints = {'audio': true, 
                            'video': {facingMode: "user" },
                             }
        const screenSharingButton = document.getElementById('screen_sharing_button');
        screenSharingButton.addEventListener('click', async ()=>{
            const screenActive = getState().screenSharingActive;
            switchBetweenCameraAndScreenSharing(screenActive);
            console.log('Screen sharing button clicked');
        });
    }

    await navigator.mediaDevices.getUserMedia(constraints)
    .then(localMedia => {
        setLocalStrem(localMedia);
        const localUser = document.querySelector('#localuser');
        localUser.srcObject = localMedia;
        console.log('local media devices got connected:',localMedia)
    }).catch(err => {
        console.log('accessing local media devices error: ', err);
    });

    
    signaling_connection = new  WebSocket('wss://' + window.location.host + '/ws/videocall/' + channel_name + '/')

    signaling_connection.onopen = ()=>{
        console.log('Websocket connection established');
        signaling_connection.send(JSON.stringify({'type':'ready'}));
    };
    
    signaling_connection.addEventListener('message', handleMessage);
};


const createUserConnection = ()=>{
    userconnection = new RTCPeerConnection(server);
    console.log('RTC userconnection established.');

    // add local media
    const localMedia = getState().localStream;
    localMedia.getTracks().forEach((track) => {
        userconnection.addTrack(track, localMedia);
        console.log('local tracks added to RTC connection:',localMedia.getVideoTracks()[0]);
    }); 

    // add receiving tracks from remote user
    const remoteMedia = new MediaStream();
    setRemoteStream(remoteMedia);
    const remoteUser = document.querySelector('#remoteuser');
    remoteUser.srcObject = remoteMedia;
    userconnection.ontrack = (event)=>{
        remoteMedia.addTrack(event.track);
        console.log('remote tracks added to RTC connection:',remoteMedia);
    }; 
    
    userconnection.onicecandidate = (event)=>{
        if(event.candidate){
            // send ice candidate
            signaling_connection.send(JSON.stringify({
                'uid':uid,
                'type':'candidate',
                'candidate':event.candidate,
            }));
        };
    };

    userconnection.onconnectionstatechange = (event)=>{
        if(userconnection.connectionState === 'connected'){
            console.log('succesfully connected to remote user.')
        };
    };
};


const handleMessage = (event)=>{
    const data = JSON.parse(event.data);

    switch (data.message.type){
        case 'offer':
            if(uid === data.message.uid){
                return;
            }else{
                document.getElementById('remote-username').innerHTML = data.message.username;
                sendUserAnswer(data.message.offer);
            };
            break;
        case 'answer':
            if(uid === data.message.uid){
                return;
            }else{
                addAnswer(data.message.answer);
            };
            break;
        case 'candidate':
            if(uid === data.message.uid){
                return;
            }else{
                addCandidate(data.message.candidate);
            };
            break;
        case 'ready':
            sendUserOffer();
            break;
        case 'hangup':
            if(uid === data.message.uid){
                return;
            }else{
                closeRemoteVideo();
            };
        default:
            return;
    }
};

const sendUserOffer = async()=>{
    createUserConnection();

    setLocalUser(userconnection);

    let localuser = getState().localUser;

    const offer = await localuser.createOffer();
    await localuser.setLocalDescription(offer);

    console.log('sdp offer to remote user: ', offer);
    console.log('offer',offer.sdp)
    signaling_connection.send(JSON.stringify({
        'uid' : uid,
        'username':localUsername,
        'type':'offer',
        'offer':offer,
    }));
};

const sendUserAnswer = async (offer)=>{
    createUserConnection();

    setRemoteUser(userconnection);

    let remoteuser = getState().remoteUser;
    
    await remoteuser.setRemoteDescription(offer);

    const answer = await remoteuser.createAnswer();
   
    await remoteuser.setLocalDescription(answer);
    console.log('sdp answer from remote user: ', answer);
    signaling_connection.send(JSON.stringify({
        'uid':uid,
        'type' : 'answer',
        'answer' : answer,
    }));
};

const addAnswer = (answer)=>{
    let localuser = getState().localUser;
    localuser.setRemoteDescription(answer);
    console.log('remote answer came:', answer)
    console.log('answer',answer.sdp)
};

const addCandidate = async (candidate)=>{
    console.log('icecandidate:',candidate);
    try{
        await userconnection.addIceCandidate(candidate);
    }catch (error) {
        console.log('error occured while ice candidate:',error);
    }
};


let screenSharingStream;

export const switchBetweenCameraAndScreenSharing = async (screenSharingActive)=>{
    if(screenSharingActive){
        const localStream = getState().localStream;
        let localUser = getState().localUser;
        const senders = localUser.getSenders();
        const sender = senders.find((sender)=>
            sender.track.kind === localStream.getVideoTracks()[0].kind );
            if(sender){
                sender.replaceTrack(localStream.getVideoTracks()[0]);
            };

        // stop screen sharing
        store
        .getState()
        .screenSharingStream
        .getTracks()
        .forEach((track)=>{
            track.stop();
        });

        const localVideo = document.querySelector('#localuser');
        localVideo.srcObject = localStream;
        setScreenSharingActive(!screenSharingActive);

        updateScreenSharingButton(!screenSharingActive);
    }else {
        console.log('switching to screen sharing');
        try {
            screenSharingStream = await navigator.mediaDevices.getDisplayMedia({'audio':false, 'video':true});
            setScreenSharingStream(screenSharingStream);
            console.log('screen sharing media:',screenSharingStream.getVideoTracks()[0])
            let localUser = getState().localUser;
            const senders = localUser.getSenders();
            console.log('senders:',senders);
            const sender = senders.find((sender)=>
            sender.track.kind === screenSharingStream.getVideoTracks()[0].kind );
            console.log('sender:',sender);
            if(sender){
                sender.replaceTrack(screenSharingStream.getVideoTracks()[0]);
                console.log('replaced video:',sender)
            };
            const localVideo = document.querySelector('#localuser');
            localVideo.srcObject = screenSharingStream;
            setScreenSharingActive(!screenSharingActive);
            updateScreenSharingButton(!screenSharingActive);
        }catch (error) {
            console.log('error in screen sharing:',error)
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
        'uid' : uid,
        'type':'hangup',
    }));

    window.open('/videocall/', '_self');
})

const updateScreenSharingButton = (screenActive) => {
    const screenButtonImage = document.getElementById('screen_sharing_button');
    screenButtonImage.style.background = screenActive ? 'rgb(240, 61, 61)' : '#04070aea';
}

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

const setRemoteUsername = (username) => {
    streams = {
        ...streams,
        remoteUsername: username,
    };
};

const setIsMobile = (condition) => {
    streams = {
        ...streams,
        isMobile: condition,
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
