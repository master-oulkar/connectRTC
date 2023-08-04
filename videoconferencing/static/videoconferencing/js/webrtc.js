import * as store from './store_stream.js';
import { updateCameraButton, updateScreenSharingButton } from './videocall_controls.js';

let userconnection;
let signaling_connection;
let uid =  Math.floor((Math.random() * 1000));

const server = {
    iceServer: [{
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }]
}

const channel_name = document.querySelector('#channel-name').innerHTML;
const localUsername = document.querySelector('#username').innerHTML;

const getLocalMedia = async ()=>{

    await navigator.mediaDevices.getUserMedia({'audio': true, 
                                               'video': true,
                                            })

    .then(localMedia => {
        store.setLocalStrem(localMedia);
        const localUser = document.querySelector('#localuser');
        localUser.srcObject = localMedia;
        console.log('local media devices got connected:',localMedia)
    }).catch(err => {
        console.log('accessing local media devices error: ', err);
    });

    const screenSharingButton = document.getElementById('screen_sharing_button');
    
    screenSharingButton.addEventListener('click', async ()=>{
        const screenActive = store.getState().screenSharingActive;
        switchBetweenCameraAndScreenSharing(screenActive);
        console.log('screenActive:', screenActive);
    });

    signaling_connection = new  WebSocket('wss://' + window.location.host + '/ws/videocall/' + channel_name + '/')

    signaling_connection.onopen = ()=>{
        signaling_connection.send(JSON.stringify({'type':'ready'}));
    };
    
    signaling_connection.addEventListener('message', handleMessage);
};


const createUserConnection = ()=>{
    userconnection = new RTCPeerConnection(server);
    console.log('RTC userconnection established.');

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

    // add receiving tracks from remote user
    const remoteMedia = new MediaStream();
    store.setRemoteStream(remoteMedia);
    const remoteUser = document.querySelector('#remoteuser');
    remoteUser.srcObject = store.getState().remoteStream;
    userconnection.ontrack = (event)=>{
        remoteMedia.addTrack(event.track);
        console.log('remote tracks added to RTC connection:',remoteMedia);
    };
    
    // add local media
    const localMedia = store.getState().localStream;
    localMedia.getTracks().forEach((track) => {
        userconnection.addTrack(track, localMedia);
        console.log('local tracks added to RTC connection:',localMedia.getVideoTracks()[0]);
    });  
};


const handleMessage = (event)=>{
    const data = JSON.parse(event.data);
    console.log('received message from server:',data.message);

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

    store.setLocalUser(userconnection);

    let localuser = store.getState().localUser;

    const offer = await localuser.createOffer();
    await localuser.setLocalDescription(offer);

    signaling_connection.send(JSON.stringify({
        'uid' : uid,
        'username':localUsername,
        'type':'offer',
        'offer':offer,
    }));
};

const sendUserAnswer = async (offer)=>{
    createUserConnection();

    store.setRemoteUser(userconnection);

    let remoteuser = store.getState().remoteUser;
    
    await remoteuser.setRemoteDescription(offer);

    const answer = await remoteuser.createAnswer();
   
    await remoteuser.setLocalDescription(answer);

    signaling_connection.send(JSON.stringify({
        'uid':uid,
        'type' : 'answer',
        'answer' : answer,
    }));
};

const addAnswer = (answer)=>{
    let localuser = store.getState().localUser;
    localuser.setRemoteDescription(answer);
    console.log('webrtc answer came:', answer)
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
        const localStream = store.getState().localStream;
        let localUser = store.getState().localUser;
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
        store.setScreenSharingActive(!screenSharingActive);

        updateScreenSharingButton(!screenSharingActive);
    }else {
        console.log('switching to screen sharing');
        try {
            screenSharingStream = await navigator.mediaDevices.getDisplayMedia({'audio':false, 'video':true});
            store.setScreenSharingStream(screenSharingStream);
            console.log('screen sharing media:',screenSharingStream.getVideoTracks()[0])
            let localUser = store.getState().localUser;
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
            store.setScreenSharingActive(!screenSharingActive);
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

    window.open('/videocall/', '_self');

    userconnection.close();

    const localStream = store.getState().localStream;
    localStream.getTracks().forEach(function (track) {
        track.stop();
    });

    signaling_connection.send(JSON.stringify({
        'uid' : uid,
        'type':'hangup',
    }));
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
    const localStream = store.getState().localStream;
    const cameraEnabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !cameraEnabled;
    updateCameraButton(cameraEnabled);
});

getLocalMedia();
