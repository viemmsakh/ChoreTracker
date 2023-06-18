import React, { Component } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import { UserProvider } from "./lib/Context";
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      origin: window.origin.includes('henderson5') ? 'https://api.henderson5.com' : 'http://localhost:8000',
      theme: 'dark',
    };

    this.themeLight = createTheme({
      palette: {
        background: {
          default: "#efefef",
        },
      },
    });

    this.themeDark = createTheme({
      palette: {
        mode: 'dark',
      },
    });

    // Bind
  }
  componentDidMount() {
    this.setState({ theme: this.getPreferredScheme() }); // Set Theme Initially
    window.matchMedia(' (prefers-color-scheme: dark)').addEventListener('change', event => {
      this.setState({ theme: this.getPreferredScheme() });
    });
  };

  getPreferredScheme() {
      return window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ? 'dark' : 'light'
  }

  async logout() {
    window.localStorage.removeItem('me');
    window.localStorage.removeItem('token');
    
    const url = `${this.state.origin}/logout`;
    const options = {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Authorization': this.state.jwt,
      }
    };
    await fetch(url, options);
    window.location.href = '/#/login';
  }

  render() {
    const context = {
      origin: this.state.origin,
      logout: () => { this.logout() },
      theme: this.state.theme,
    };
    return (
      <HashRouter basename="/">
          <ThemeProvider theme={this.state.theme === 'light' ? this.themeLight : this.themeDark}>
            <CssBaseline />
            <UserProvider value={context}>
                <Routes>
                    <Route path='/' element={<Home />} />
                    <Route path='/login' element={<Login />} />
                </Routes>
            </UserProvider>
          </ThemeProvider>
      </HashRouter>
    );
  }
}
