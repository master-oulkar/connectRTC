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


export const setBackCameraStream = (stream)=>{
    streams = {
        ...streams,
        backCameraStream: stream,
    };
}

export const setCameraActive = (condition)=>{
    streams = {
        ...streams,
        cameraActive: condition,
    };
}

export const setRemoteUsername = (username) => {
    streams = {
        ...streams,
        remoteUsername: username,
    };
};

export const setLocalStrem = (stream) => {
    streams = {
        ...streams,
        localStream: stream,
    };
};


export const setScreenSharingStream = (stream) => {
    streams = {
        ...streams,
        screenSharingStream:stream,
    };
};

export const setRemoteStream = (stream)=>{
    streams = {
        ...streams,
        remoteStream:stream,
    };
};


export const setLocalUser = (uid) => {
    streams = {
        ...streams,
        localUser: uid,
    };
};

export const setRemoteUser = (uid) => {
    streams = {
        ...streams,
        remoteUser: uid,
    };
};

export const setScreenSharingActive = (screenSharingActive) => {
    streams = {
        ...streams,
        screenSharingActive: screenSharingActive,
    };
};


export const getState = ()=>{
    return streams
};