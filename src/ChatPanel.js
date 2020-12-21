import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = (props) => {
    const [canScrollLoad, setCanScrollLoad] = useState(true);
    let { SignOut, user } = props;

    const toggleChatDropdown = () => {
        document.getElementById("chatDropdown").classList.toggle("active");
    }

    const selectChat = (e) => {
        console.log(`will select ${e.target.id}`);
        setCanScrollLoad(false);
        props.setCurrentChatId(e.target.id);
        toggleChatDropdown();
    }

    return <div className="chat-panel">
        <header>
        <div className="dropdown">
            <button onClick={toggleChatDropdown} className="dropbtn">Daniel Way</button>
            <div id="chatDropdown" className="dropdown-content">
                {props.userChats.map((room, i) =>
                    <div key={room} onClick={selectChat} id={room} className="chatDropdown-btn">{room}</div>
                )}
            </div>
        </div>
            <SignOut />
        </header>
        <section>
            {(user) ? <ChatRoom messages={props.messages}
                canScrollLoad={canScrollLoad}
                setCanScrollLoad={setCanScrollLoad}
                loadPreviousMsgs={props.loadPreviousMsgs}
                setTopMsgRef={props.setTopMsgRef} sendMsg={props.sendMsg} sendMediaMsg={props.sendMediaMsg} currentUserId={user.uid} /> : <SignIn signIn={props.signInWithGoogle}/>}
        </section>
    </div>;
}


const ChatRoom = ({ messages, setMessages, canScrollLoad, setCanScrollLoad, loadPreviousMsgs, setTopMsgRef, sendMsg, sendMediaMsg, currentUserId }) => {
    const [mounted, setMounted] = useState(false);
    const [formValue, setFormValue] = useState('');
    const bottom = useRef();

    const handleChatScroll = (e) => {
        if(e.target.scrollTop === 0 && mounted && canScrollLoad) loadPreviousMsgs();
        setCanScrollLoad(true);
    }

    const handleImageUpload = (event) => {
        event.preventDefault();
        document.getElementById('mediaCapture').click();
    };

    const onMediaFileSelected = (event) => {
        event.preventDefault();
        let file = event.target.files[0];
        // Clear the selection in the file picker input.
        document.getElementById('chatForm').reset();

        // Check if the file is an image.
        if (!file.type.match('image.*')) {
        //     let data = {
        //         message: 'You can only share images',
        //         timeout: 2000
        //     };
        //     signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
            return;
        }

        sendMediaMsg(file);
    }

    const handleSendMsg = (event) => {
        event.preventDefault();
        let submission = event.target.value || formValue;

        if(!submission) return;
        sendMsg(submission);
        setFormValue('');
        event.target.value = '';
    }

    const handleEnterPress = (event) => {
        if(event.which === 13) {
            event.preventDefault();
            handleSendMsg(event);
        }
    };

    const initSpan = (chatInput, span) => {
        span.innerText = chatInput.innerText;
        span.width = chatInput.width;
        span.style.font = chatInput.style.font;
    };

    useEffect(() => {
        let span;
        let chatBody = document.getElementById('chatBody');
        let chatInput = document.getElementById('chatInput');
        let chatForm = document.querySelector('#chatForm'); // Must be a DOM Node
        let mediaCaptureElement = document.getElementById('mediaCapture');

        // if(!document.getElementById('chatInput-resizer')) {
        //     span = document.createElement('span');
        //     span.id = 'chatInput-resizer';
        //     span.className = 'textarea-verticalResizer';
        //     chatForm.appendChild(span);
        // }

        // chatInput.addEventListener('focus', () => initSpan(chatInput, span));
        chatInput.addEventListener('keydown', handleEnterPress);
        // chatInput.addEventListener('input', (event) => {
        //     span.innerText = event.target.value;
        //     chatForm.style.height = (event.target.value)
        //         ? span.offsetHeight
        //         : 'initial';
        // });

        bottom.current.scrollIntoView({ behavior: 'smooth',  block: 'start' });
        setMounted(true);
        return () => {
            chatInput.removeEventListener('keydown', handleEnterPress);
        }
    }, []);

    useEffect(() => {
        if(messages && messages[0]) {
            setTopMsgRef(messages[0]);
        }

        bottom.current.scrollIntoView({ behavior: 'smooth',  block: 'end' });
    }, [messages]);

    return <>
        <main id="chatBody" onScroll={handleChatScroll}>
            <div className="loadingDiv">Loading More Messages...</div>
            {messages && messages.map(msg => <ChatMessage key={msg.id} msg={msg} currentUserId={currentUserId} />)}
            <div ref={bottom} />
        </main>
        <form id="chatForm" onSubmit={(e) => handleSendMsg(e)}>
            <input id="mediaCapture" type="file" accept="image/*" capture="camera" onChange={onMediaFileSelected} hidden />
            <button className="image-btn" onClick={handleImageUpload}>📷</button>
            <textarea id="chatInput" value={formValue} placeholder="Message" onChange={(e) => setFormValue(e.target.value)} />
            <button className="submit-btn" type="submit" disabled={!formValue}>📣</button>
        </form>
    </>;
}

const ChatMessage = ({ msg, currentUserId }) => {
    const msgClass = (msg.uid === currentUserId) ? 'sent' : 'received';

    const messageBody = (msg) => {
        if(msg.type === 'link') {
            return (msg.mediaUrl === 'LOADING_IMAGE_URL')
                ? <LoadingRipple />
                : <a target="_blank" rel="noopener noreferrer" href={msg.linkURL}>
                    <div className="message-body isLink">
                        <img className="link-image" src={msg.mediaUrl}/>
                        <div className="link-banner">
                            <h5>{msg.title}</h5>
                            <p className="linkURL">{msg.linkURL}</p>
                        </div>
                    </div>
                </a>
        } else if(msg.type === 'media') {
            return (msg.mediaUrl === 'LOADING_IMAGE_URL')
                ? <LoadingRipple />
                : <div className="message-body hasImage">
                    <img className="message-image" src={msg.mediaUrl}/>
                </div>;
        } else {
            return <div className="message-body"><p>{msg.text}</p></div>;
        }
    }
    // TODO: Must determine whether it is a text, image, or link message
    return <div className={`message ${msgClass}`}>
    <img className="chat-panel-profileIcon" src={msg.photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} />
        {messageBody(msg)}
    </div>
}

const SignIn = ({ signIn }) => <button onClick={signIn}>Sign in with Google</button>;

const LoadingRipple = () => <div className="lds-ripple"><div></div><div></div></div>;

export default ChatPanel;
