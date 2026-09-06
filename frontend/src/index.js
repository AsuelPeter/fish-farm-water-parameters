import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
            dark: '#0d47a1',
            light: '#42a5f5',
        },
        secondary: {
            main: '#00897b',
            dark: '#00695c',
            light: '#4db6ac',
        },
        background: {
            default: '#f5f7fa',
            paper: '#ffffff',
        },
        success: { main: '#2e7d32' },
        warning: { main: '#f57c00' },
        error: { main: '#d32f2f' },
        info: { main: '#0288d1' },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                },
            },
        },
    },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <App />
                <Toaster position="top-right" />
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>
);
