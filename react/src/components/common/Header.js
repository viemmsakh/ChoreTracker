import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import { AppBar, Box, Grid, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

import UserConsumer from '../../lib/Context';

export default class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
    };
    // Bind
    this.toggleMenu = this.toggleMenu.bind(this);
    this.menuRef = React.createRef(null);
  }
  static propTypes = {
    display: PropTypes.string,
    family: PropTypes.string,
  };
  static contextType = UserConsumer;

  toggleMenu() {
    const { open } = this.state;
    this.setState({ open: !open });
  }

  render() {
    return (
      <>
        <Box sx={{ flexGrow: 1}}>
          <AppBar position='static'>
            <Toolbar>
              <Grid container spacing={0}>
                <Grid item xs={12} lg={6}
                  sx={{
                    display: 'flex',
                    justifyContent: {
                      xs: 'center',
                      lg: 'flex-start',
                    },
                    mt: {
                      xs: 1,
                      lg: 0,
                    },
                    alignItems: 'center',
                  }}
                >
                  <Typography variant='h6'>{this.props.family}</Typography>
                </Grid>
                <Grid item xs={12} lg={6}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    mb: {
                      xs: 1,
                      lg: 0,
                    },
                  }}
                >
                <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      width: {
                        xs: '100%',
                        lg: 'unset',
                      },
                    }}
                  >
                    <span>
                      <b>Welcome,</b>&nbsp;
                      <span>{this.props.display}!</span>
                    </span>
                    <IconButton
                      size='large'
                      color='inherit'
                      sx={{
                        ml: 2,
                        p: 0,
                      }}
                      ref={this.menuRef}
                      onClick={() => {
                        this.toggleMenu();
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Toolbar>
          </AppBar>
        </Box>
        <Menu
          anchorEl={this.menuRef.current}
          open={this.state.open}
          onClose={() => {
            this.toggleMenu();
          }}
        >
          <MenuItem
            onClick={() => {
              this.context.logout();
            }}
          >Logout</MenuItem>
        </Menu>
      </>
    )
  }
}
