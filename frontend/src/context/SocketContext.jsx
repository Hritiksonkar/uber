
import React, { createContext, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

export const SocketContext = createContext();

const socket = io(SOCKET_URL);

const SocketProvider = ({ children }) => {
    useEffect(() => {
        // Basic connection logic
        const onConnect = () => {
            console.log('Connected to server');
        };

        const onDisconnect = () => {
            console.log('Disconnected from server');
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };

    }, []);



    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;