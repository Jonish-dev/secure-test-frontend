
import axios from 'axios';


const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const startAttempt = async () => {
    const response = await apiClient.post('/start-attempt');
    return response.data;
};

export const getAttemptStatus = async (attemptId: string) => {
    const response = await apiClient.get(`/attempt-status/${attemptId}`);
    return response.data;
};

export const logEvents = async (attemptId: string, events: any[]) => {
    const response = await apiClient.post('/log-events', { attemptId, events });
    return response.data;
};

export const submitAttempt = async (attemptId: string) => {
    const response = await apiClient.post(`/submit/${attemptId}`);
    return response.data;
};
