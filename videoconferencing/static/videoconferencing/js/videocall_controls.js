import * as store from './store_stream.js';

// event listeners for camera on - off
const cameraOnImage = "/static/videoconferencing/img/camera.png"
const cameraOffImage = "/static/videoconferencing/img/cameraOff.png"
const micOnImage = "/static/videoconferencing/img/mic.png"
const micOffImage = "/static/videoconferencing/img/micOff.png"

const cameraButton = document.getElementById('camera_button');
cameraButton.addEventListener('click', () => {
    const localStream = store.getState().localStream;
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
    const localStream = store.getState().localStream;
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
export const updateScreenSharingButton = (screenActive) => {
    const screenButtonImage = document.getElementById('screen_sharing_button');
    screenButtonImage.style.background = screenActive ? 'rgb(240, 61, 61)' : '#04070aea';
}

