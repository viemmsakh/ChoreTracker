import React, { Component, Suspense } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, CircularProgress } from '@mui/material';
import UserContext from '../lib/Context';
import EditIcon from '@mui/icons-material/Edit';

export default class PersonOverview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chores: [],
      loaded: false,
      jwt : window.localStorage.getItem('token') || '',
    };
  }
  static propTypes = {
    uuid: PropTypes.string.isRequired,
    edit: PropTypes.func.isRequired,
  };

  static contextType = UserContext;


  async componentDidMount() {
    const { uuid } = this.props;
    if (uuid) {
      const data = await this.getPersonChores(uuid);
      const chores = data.sort((a, b) => {
        if (a.chore_name.toLowerCase() > b.chore_name.toLowerCase()) return -1;
        if (a.chore_name.toLowerCase() < b.chore_name.toLowerCase()) return 1;
        return 0;
      });
      this.setState({ chores, loaded: true });
    }
  }
  async getPersonChores(uuid) {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/familychores?id=${uuid}`;
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
        resolve(data.message);
      } else {
        this.context.logout();
      }
    });
  }
  render() {
    return (
      <Box
        sx={{
          pl: 1,
          pr: 1,
          minHeight: '50px',
        }}
      >
      { this.state.loaded
        ? (
          <>
            { this.state.chores.length
              ? (
                <>
                  { this.state.chores.map((c, i) => {
                    const { chore, chore_name } = c;
                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderBottom: i + 1 !== this.state.chores.length ? '1px solid #DDD' : '',
                          alignItems: 'center',
                          minHeight: '40px',
                        }}
                      >
                        {chore_name.toUpperCase()}
                        <Button
                          size='small'
                          variant='text'
                          sx={{
                            pl: 0,
                            pr: 0,
                            minWidth: 0,
                          }}
                          onClick={() => {
                            this.props.edit(c);
                          }}
                        >
                          <EditIcon />
                        </Button>
                      </Box>
                    );
                  })}
                </>
              )
              : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '40px',
                  }}
                >
                  No Chores
                </Box>
              )
            }
          </>
        )
        : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        )
      }
      </Box>
    )
  }
};
