import React, { Component } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Settings from './components/Settings';
import { UserProvider } from "./lib/Context";
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { v4 as uuidv4 } from 'uuid';
import Register from './components/Register';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      origin: window.origin.includes('henderson5') ? 'https://api.henderson5.com' : 'http://localhost:8000',
      theme: 'dark',
      jwt : window.localStorage.getItem('token') || '',
      errors: [],
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
    this.getMyInfo = this.getMyInfo.bind(this);
    this.getMyFamily = this.getMyFamily.bind(this);
    this.permCheck = this.permCheck.bind(this);
    this.updateErrors = this.updateErrors.bind(this);
    this.changeDisplayName = this.changeDisplayName.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.orphan = this.orphan.bind(this);
    this.orphanFamily = this.orphanFamily.bind(this);
  }
  componentDidMount() {
    this.setState({ theme: this.getPreferredScheme() }); // Set Theme Initially
    window.matchMedia(' (prefers-color-scheme: dark)').addEventListener('change', event => {
      this.setState({ theme: this.getPreferredScheme() });
    });
  };

  async changeDisplayName(uuid = null, name = null) {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/changedisplayname`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid,
          new_display_name: name,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        resolve('ok');
      } else {
        resolve('error');
      }
    });
  }

  async changePassword(uuid = null, password = null) {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/changepassword`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid,
          password,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        resolve('ok');
      } else {
        resolve('error');
      }
    });
  }

  async orphan(uuid = null) {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/orphan`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        resolve('ok');
      } else {
        resolve('error');
      }
    });
  }

  async orphanFamily(uuid = null) {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/orphanfamily`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        resolve('ok');
      } else {
        resolve('error');
      }
    });
  }

  getPreferredScheme() {
      return window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ? 'dark' : 'light'
  }

  async getMyInfo() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/myinfo`;
      const options = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
        }
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const data = await resp.json();
        if (data.status === 500) {
          await this.updateErrors(data?.message);
        }
        resolve({ name: data?.message?.name, family_name: data?.message?.family_name, uuid: data?.message?.uuid, family_permission: data?.message?.family_permission });
      } else {
        this.logout();
      }
    });
  }

  async getMyFamily() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/myfamily`;
      const options = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
        }
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const data = await resp.json();
        if (data.status === 500) {
          await this.state.updateErrors(data.message);
        }
        const sorted = data.message.sort((a, b) => {
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;
        })
        resolve(sorted);
      } else {
        this.logout();
      }
    });
  }

  async permCheck() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.state.origin}/perm`;
      const options = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
        }
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const data = await resp.json();
        if (data?.status === 500) {
          await this.updateErrors(data.message);
        }
        resolve(data?.message);
      } else {
        this.logout();
      }
    });
  }

  updateErrors(err) {
    return new Promise((resolve, reject) => {
      const { errors } = this.state;
      errors.push({
        msg: err,
        id: uuidv4(),
      });
      this.setState({ errors }, () => {
        resolve(true);
      })
    })
  }

  navigate(path) {
    if (path) {
      window.location.href = `/#/${path}`;
    } else {
      window.location.href = `/#/`;
    }
  }

  async logout() {
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
      changeDisplayName: this.changeDisplayName,
      changePassword: this.changePassword,
      orphan: this.orphan,
      orphanFamily: this.orphanFamily,
      logout: () => { this.logout() },
      navigate: (path) => { this.navigate(path) },
      theme: this.state.theme,
      getMyInfo: this.getMyInfo,
      getMyFamily: this.getMyFamily,
      permCheck: this.permCheck,
      jwt: this.state.jwt,
    };
    return (
      <HashRouter basename="/">
          <ThemeProvider theme={this.state.theme === 'light' ? this.themeLight : this.themeDark}>
            <CssBaseline />
            <UserProvider value={context}>
                <Routes>
                    <Route path='/' element={<Home />} />
                    <Route path='/settings' element={<Settings />} />
                    <Route path='/login' element={<Login />} />
                    <Route path='/register' element={<Register />} />
                </Routes>
            </UserProvider>
          </ThemeProvider>
      </HashRouter>
    );
  }
}
