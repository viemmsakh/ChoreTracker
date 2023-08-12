import React, { Component } from 'react';
import { Box, Button, Container, Link, Paper, TextField, Typography } from '@mui/material';

import UserContext from '../lib/Context';

import KeyIcon from '@mui/icons-material/Key';

export default class Register extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: {
        value: '',
        error: false,
        helperText: '',
      },
      display: {
        value: '',
        error: false,
        helperText: '',
      },
      password: {
        value: '',
        error: false,
        helperText: '',
      },
      confirm: {
        value: '',
        error: false,
        helperText: '',
      },
      failed: false,
      failed_reason: '',
    };

    // BIND
    this.checkUsername = this.checkUsername.bind(this);
    this.register = this.register.bind(this);
  }

  static contextType = UserContext;

  async checkUsername() {
    const { username } = this.state;
    if (username.value !== '') {
      const url = `${this.context.origin}/checkusername`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.value,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const data = await resp.json();
        const { username } = this.state;
        if (data?.message) {
          username.error = true;
          username.helperText = data.message;
        } else {
          username.error = false;
          username.helperText = '';
        }
        this.setState({ username });
      }
    }
  }

  async register() {
    const { username, display, confirm, password } = this.state;
    if (!username.error && !confirm.error && !password.error && !display.error) {
      const url = `${this.context.origin}/register`;
      const options = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.value,
          password: password.value,
          name: display.value,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        window.location.href = '/#/login';
      } else {
        const failed = true;
        const failed_reason = 'Could not register account at this time';
        this.setState({ failed, failed_reason });
      }
    } else {
      const failed = true;
      const failed_reason = 'Please correct errors';
      this.setState({ failed, failed_reason });
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
            <Typography variant='body1'
              sx={{ color: 'red' }}
            >
              { this.state.failed ? this.state.failed_reason : '' }
            </Typography>
            <TextField
                label="Username"
                variant="outlined"
                size='small'
                color={this.state.username.error ? 'error' : 'primary'}
                error={this.state.username.error}
                fullWidth
                required
                helperText={this.state.username.helperText}
                value={this.state.username.value}
                onChange={(e) => {
                  const { username } = this.state;
                  const { value } = e.target;
                  username.value = value;
                  this.setState({ username });
                }}
                onBlur={() => {
                  const { username } = this.state;
                  if (!username.value || username.value === '') {
                    username.error = true;
                    username.helperText = 'Username cannot be blank';
                  } else {
                    username.error = false;
                    username.helperText = '';
                  }
                  if (username.error) {
                    this.setState({ username });
                  } else {
                    this.checkUsername();
                  }
                }}
              />
            <TextField
                label="Display Name"
                variant="outlined"
                size='small'
                color={this.state.display.error ? 'error' : 'primary'}
                error={this.state.display.error}
                fullWidth
                required
                helperText={this.state.display.helperText}
                value={this.state.display.value}
                onChange={(e) => {
                  const { display } = this.state;
                  const { value } = e.target;
                  display.value = value;
                  this.setState({ display });
                }}
                onBlur={() => {
                  const { display } = this.state;
                  if (!display.value || display.value === '') {
                    display.error = true;
                    display.helperText = 'Display Name cannot be blank';
                  } else {
                    display.error = false;
                    display.helperText = '';
                  }
                  if (display.error) {
                    this.setState({ display });
                  }
                }}
              />
            <TextField
              label="Password"
              type='password'
              variant="outlined"
              size='small'
              helperText={this.state.password.helperText}
              color={this.state.password.error ? 'error' : 'primary'}
              error={this.state.password.error}
              value={this.state.password.value}
              onChange={(e) => {
                const { password } = this.state;
                const { value } = e.target;
                password.value = value;
                this.setState({ password });
              }}
              onBlur={() => {
                const { password } = this.state;
                if (!password.value || password.value === '') {
                  password.error = true;
                  password.helperText = 'Password cannot be blank';
                } else {
                  password.error = false;
                  password.helperText = '';
                }
                if (password.error) {
                  this.setState({ password });
                }
              }}
              fullWidth
              required
            />
            <TextField
              label="Confirm Password"
              type='password'
              variant="outlined"
              size='small'
              helperText={this.state.confirm.helperText}
              color={this.state.confirm.error ? 'error' : 'primary'}
              error={this.state.confirm.error}
              value={this.state.confirm.value}
              onChange={(e) => {
                const { confirm, password } = this.state;
                const { value } = e.target;
                confirm.value = value;
                if (confirm.value !== password.value) {
                  confirm.error = true;
                  confirm.helperText = 'Confirm password does not match';
                } else {
                  confirm.error = false;
                  confirm.helperText = '';
                }
                this.setState({ confirm });
              }}
              fullWidth
              required
            />
            <Button
              fullWidth
              variant='outlined'
              onClick={() => {
                this.register();
              }}
            >
              Register
            </Button>
          </Paper>
        </Container>
      </>
    )
  }
};
