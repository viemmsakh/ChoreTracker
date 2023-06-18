import React, { Component } from 'react';
import { Button, Container, Paper, TextField, Typography } from '@mui/material';

import UserContext from '../lib/Context';

import KeyIcon from '@mui/icons-material/Key';

export default class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: {
        value: '',
        error: false,
      },
      password: {
        value: '',
        error: false,
      },
      failed: false,
      failed_reason: '',
    };

    // BIND
    this.login = this.login.bind(this);
  }

  static contextType = UserContext;

  componentDidMount() {
    if(window.localStorage.getItem('token') !== null) {
      window.localStorage.removeItem('token');
    }
  }

  async login() {
    const state = { ...this.state };
    if (!this.state.username.value || this.state.username.value === '') {
      state.username.error = true;
    }
    if (!this.state.password.value || this.state.password.value === '') {
      state.password.error = true;
    }
    if (this.state.username.value !== '' && this.state.password.value !== ''){
      const url = `${this.context.origin}/login`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: this.state.username.value,
          password: this.state.password.value,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const body = await resp.json();
        window.localStorage.setItem('token', body.token);
        window.location.href = '/';
      } else {
        state.failed = true;
        state.failed_reason = 'Unauthorized Invalid Username/Password'
        this.setState(state)
      }
    } else {
      state.failed = true;
      state.failed_reason = 'Username/Password required';
      this.setState(state);
    }
  }

  render() {
    return (
      <>
        <Container maxWidth='xs'
          sx={{
            marginTop: '50px',
            minWidth: '300px',
          }}
        >
          <Paper
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center',
              padding: '24px',
            }}
          >
            <KeyIcon
              sx={{
                color: '#DDD',
                fontSize: '150px',
              }}
            />
            <Typography variant='body1'
              sx={{ color: 'red' }}
            >
              { this.state.failed ? this.state.failed_reason : '' }
            </Typography>
            <TextField
                label="Username"
                variant="outlined"
                color={this.state.username.error ? 'error' : 'primary'}
                error={this.state.username.error}
                fullWidth
                required
                value={this.state.username.value}
                onChange={(e) => {
                  const { username } = this.state;
                  const { value } = e.target;
                  username.value = value;
                  this.setState({ username });
                }}
              />
            <TextField
              label="Password"
              type='password'
              variant="outlined"
              color={this.state.password.error ? 'error' : 'primary'}
              error={this.state.password.error}
              value={this.state.password.value}
              onChange={(e) => {
                const { password } = this.state;
                const { value } = e.target;
                password.value = value;
                this.setState({ password });
              }}
              onKeyPress={(e) => {
                if(e.key === 'Enter'){
                  this.login();
                }
              }}
              fullWidth
              required
            />
            <Button
              fullWidth
              variant='outlined'
              onClick={() => {
                this.login();
              }}
            >
              Login
            </Button>
          </Paper>
        </Container>
      </>
    )
  }
};
