import { io } from 'socket.io-client';

export default defineNuxtPlugin(() => {
  const socket = io('http://localhost:3002'); // Update if backend runs elsewhere

  return {
    provide: {
      socket,
    },
  };
});
