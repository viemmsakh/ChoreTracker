import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';

export default class TabPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  static propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
  }

  render() {
    return (
      <Box
        hidden={this.props.value !== this.props.index}
      >
        {this.props.children}
      </Box>
    )
  }
}
