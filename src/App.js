/*
    - pay special attention to the search filtering on the text input
    - note that the search function process 'data' as it goes into the next component, rendering only the data matched by 'query'
 */
import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';
import 'firebase/auth';

import { useAuthState } from 'react-firebase-hooks/auth';

import Datatable from './Datatable';
import ChatPanel from './ChatPanel';

require('es6-promise').polyfill();
require('isomorphic-fetch');

firebase.initializeApp({
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID
});

const auth = firebase.auth();
const firestore = firebase.firestore();

const App = () => {

    const messagesRef = firestore.collection('messages_service').doc('directMessages');
    // const messageServiceRef = firestore.collection('messages_service')
    //     .doc(`directMessages`);

    const [snapshotData, setSnapshotData] = useState({});
    const [messages, setMessages] = useState([]);
    const [userChats, setUserChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState('');
    const [topMsgRef, setTopMsgRef] = useState(null);

    const [data, setData] = useState([]);
    const [navMenuOpen, toggleNavMenu] = useState(false);
    const [query, setQuery] = useState("");
    const [searchColumns, setSearchColumns] = useState(['firstName', 'lastName']);

    const chatId = useRef('');
    const [user] = useAuthState(auth);

    const signInWithGoogle = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then(result => {
            const initiationSnapshot = firestore.doc(`chatIds/${result.user.uid}`);
            initiationSnapshot.get().then(res => {
                let rooms = res.data();
                setUserChats([...Object.values(rooms.directMessages)]);
            })

        })
    }

    const SignOut = () => {
        return auth.currentUser && (<button style={{'marginRight':'70px'}} onClick={() => auth.signOut()}>Sign out</button>);
    }


    const loadPreviousMsgs = async () => {
        let olderMessages = [];
        if(topMsgRef.initialDocument) return;
        let loadingDiv = document.querySelector('.loadingDiv').classList;
        loadingDiv.add('active');
        const loadMoreQuery = messagesRef.collection(`${chatId.current}`)
            .orderBy('dateAdded', 'desc')
            .startAfter(topMsgRef.dateAdded)
            .limit(7);

        const data = await loadMoreQuery.get();
        data.forEach(doc => {
            let newMsg = doc.data();
            newMsg.id = doc.id;
            olderMessages.push(newMsg);
        });
        loadingDiv.remove('active');
        setMessages([...olderMessages.reverse(), ...messages]);
    }


    const checkforURL = (str) => {
        let url_regex = /^(http:\/\/www\.|https:\/\/www\.|www\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/;

        return url_regex.test(str.trim()); // TODO: to search entire message body and not just individual URLs, use str.split and iterate through arrays (only return first link, any others are ignored)
    }

    const sendMsg = async (formValue) => {
        const { uid, photoURL } = auth.currentUser;
        if(!formValue) return;

        let isURL = checkforURL(formValue);
        if(isURL) {
            sendURLMsg(uid, photoURL, formValue);
        } else {
            await messagesRef.collection(`${chatId.current}`).add({
                type: 'text',
                text: formValue,
                dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
                uid,
                photoURL,
            });
        }
    }

    // TODO: node-link-preview library is much smaller, but you'll have to configure it yourself
    const sendURLMsg = (uid, photoURL, formValue) => {
        let originalRef;
        let url = formValue;
        if(url.substring(0, 4) !== 'http') url = `https://${url}`;

        // Initiate message with a loading icon
        messagesRef.collection(`${chatId.current}`).add({
            type: 'link',
            title: '...',
            mediaUrl: 'LOADING_IMAGE_URL',
            dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
            linkURL: url,
            uid,
            photoURL,
        }).then((messageRef) => {
            originalRef = messageRef;
            fetch('http://localhost:3001/link-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            })
            .then(response => response.json())
            .then(data => {
                return originalRef.update({
                    title: data.title,
                    mediaUrl: (data.image) ? data.image : data.favicon,
                });

            // // Upload image in Cloud Storage
            // let filePath = `${uid}/${messageRef.id}/${file.name}`;
            // // TODO: Upload file with metatdata describing: uploader, messageID
            // return firebase.storage().ref(filePath).put(file).then((fileSnapshot) => {
            //     // Generate a public URL for the file.
            //     return fileSnapshot.ref.getDownloadURL().then((url) => {
            //         // Update the message placeholder with the image's URL.
            //         return messageRef.update({
            //             mediaUrl: url,
            //             storageUri: fileSnapshot.metadata.fullPath
            //         });
            //     });
            // });
            })
            .catch((error) => console.error('Error:', error));
        }).catch((error) => {
            console.error('There was an error uploading a file to Cloud Storage:', error);
        });
    }

    // Saves a new message containing an image in Firebase Storage.
    const sendMediaMsg = async (file) => {
        const { uid, photoURL } = auth.currentUser;

        // Initiate message with a loading icon
        messagesRef.collection(`${chatId.current}`).add({
            type: 'media',
            mediaUrl: 'LOADING_IMAGE_URL',
            dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
            uid,
            photoURL,
        }).then((messageRef) => {
            // Upload image in Cloud Storage
            let filePath = `${uid}/${messageRef.id}/${file.name}`;
            // TODO: Upload file with metatdata describing: uploader, messageID
            return firebase.storage().ref(filePath).put(file).then((fileSnapshot) => {
                // Generate a public URL for the file.
                return fileSnapshot.ref.getDownloadURL().then((url) => {
                    // Update the message placeholder with the image's URL.
                    return messageRef.update({
                        mediaUrl: url,
                        storageUri: fileSnapshot.metadata.fullPath
                    });
                });
            });
        }).catch((error) => {
            console.error('There was an error uploading a file to Cloud Storage:', error);
        });
    }

    useEffect(() => {
        /*
        Async version of fetch:
        async function fetchData() {
            const res = await fetch("https://devmentor.live/api/examples/contacts.json?api_key=2a2be681");
            setData(await res.json());
         }
        fetchData();
        */

        // Traditional version
        fetch("https://devmentor.live/api/examples/contacts.json?api_key=2a2be681")
        .then(res => res.json())
        .then(json => setData(json));

        document.addEventListener('scroll', function() {
            let header = document.getElementById('pageHeader');
            (window.scrollY > 20)
            ? (header.className = `navbar sticky`)
            : (header.className = `navbar`)
        });
    }, []);

    useEffect(() => {
        // TODO: when to unsubscribe chats??
        chatId.current = currentChatId
        setMessages(snapshotData[currentChatId]);
    }, [currentChatId]);


    useEffect(() => {
        if(userChats && userChats[0]) {
            let messageData = {}

            for (let chatId of userChats) {
                let addMsgToState = false;
                let changes = (messageData[chatId])
                    ? [...messageData[chatId]]
                    : [];
                let unsubscriber = messagesRef.collection(`${chatId}`).onSnapshot(snapshot => {

                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'removed') {
                            // deleteMessage(change.doc.id);
                        } else {
                            let message = change.doc.data();
                            if(message.dateAdded) {
                                addMsgToState = true;
                                message.id = change.doc.id;

                                // removes loading placeholder
                                let prevIndex;
                                changes.forEach((msg, i) => {
                                    if(msg.id === message.id) prevIndex = i;
                                });

                                if(prevIndex) changes.splice(prevIndex, 1, message);
                                else changes.push(message);
                            }
                        }
                    });
                    if(addMsgToState) {
                        messageData[chatId] = [...changes.sort((obj1, obj2) => obj1.dateAdded - obj2.dateAdded)];
                        setMessages([...messageData[chatId]]);
                    }
                });
            }
            setSnapshotData(messageData);
        }
    }, [userChats]);

    const toggleNavBtn = (event) => {
        let menuBtn = document.getElementById('toggleNavBtn');
        if(navMenuOpen) {
            menuBtn.className = 'mainMenu-toggle';
            menuBtn.nextSibling.className = 'chat-panel';
        } else {
            menuBtn.className = 'mainMenu-toggle active';
            menuBtn.nextSibling.className = 'chat-panel active';
        }
        toggleNavMenu(!navMenuOpen);
    }

    const search = (rows) => {
        return rows.filter(row =>
            searchColumns.some((col) => row[col].toString().toLowerCase().indexOf(query.toLowerCase()) > -1)
        );
    }

    const columns =  data[0] && Object.keys(data[0]);

    return (
        <div className="App">
            {/* Nav Bar */}
            <nav id="pageHeader" className="navbar">
                <div className="inner-width">
                    <a href="/" className="logo"></a>
                    <button id="toggleNavBtn" className="mainMenu-toggle" onClick={toggleNavBtn}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <ChatPanel
                        user={user}
                        signInWithGoogle={signInWithGoogle}
                        SignOut={SignOut}
                        userChats={userChats}
                        setCurrentChatId={setCurrentChatId}
                        messages={messages}
                        setMessages={setMessages}
                        loadPreviousMsgs={loadPreviousMsgs}
                        setTopMsgRef={setTopMsgRef}
                        sendMsg={sendMsg}
                        sendMediaMsg={sendMediaMsg}
                    />
                </div>
            </nav>

            {/* Home */}

            <section id="home">
                <div className="inner-width">
                    <div className="content">
                        <h1>Welcome</h1>
                    </div>
                </div>
            </section>

            {/* Contacts

            <section id="contacts">
                <div className="content">
                    <div className="search-bar">
                        <input type="text" value={query} onChange={e => setQuery(e.target.value)} />
                        {columns && columns.map((col, i) =>
                            <label key={`field-${i}`}>
                                <input type="checkbox" checked={searchColumns.includes(col)}
                                onChange={(e) =>{
                                    const checked = searchColumns.includes(col)
                                    // arrow function always gives previous state
                                    setSearchColumns(prev => checked
                                     ? prev.filter(sCol => sCol !== col)
                                     : [...prev, col])
                                }}/>
                                {col}
                            </label>
                        )}
                    </div>
                    <div className="data-table">
                        <Datatable data={search(data)}/>
                    </div>
                </div>
            </section>*/}
        </div>
    );
}

export default App;
