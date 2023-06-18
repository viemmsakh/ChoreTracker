import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import { AppBar, Box, IconButton, Menu, MenuItem, Toolbar } from '@mui/material';
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
            <Toolbar
              sx={{
                width: '100%',
                justifyContent: 'flex-end',
                gap: '1rem',
              }}
              >
              <b>Welcome,</b>
              <span>{this.props.display}!</span>
              <IconButton
                size='large'
                color='inherit'
                sx={{
                  ml: 2,
                }}
                ref={this.menuRef}
                onClick={() => {
                  this.toggleMenu();
                }}
              >
                <MenuIcon />
              </IconButton>
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
