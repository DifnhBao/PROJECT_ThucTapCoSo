"use client";
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const client = () => true;
const server = () => false;
export const useClientReady = () => useSyncExternalStore(subscribe, client, server);
