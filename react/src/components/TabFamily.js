import { Box, Button, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import React, { Component } from 'react'
import UserContext from '../lib/Context';
import PropTypes from 'prop-types';

// Icons
import PasswordIcon from '@mui/icons-material/Password';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import TimeToLeaveIcon from '@mui/icons-material/TimeToLeave';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

export default class TabFamily extends Component {
  constructor(props) {
    super(props);
    this.state = {
      parent: false,
      family: [],
    };

    // Bind
    this.load = this.load.bind(this);
  }

  static contextType = UserContext;
  static propTypes = {
    my_uuid: PropTypes.string.isRequired,
  }


  componentDidMount() {
    this.load();
  }

  async load() {
    let parent = await this.context.permCheck();
    parent = parent === 'yes' ? true : false;
    let family = [];
    if (parent) {
      family = await this.context.getMyFamily();
    }
    this.setState({ parent, family });
  }

  render() {
    return (
      <>
      <Grid container spacing={2}>
        <Grid item xs={12}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Box
            sx={{
              borderBottom: '1px solid #DDD',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant='h6'><b>Family Settings</b></Typography>
            <Button>
              <PersonAddAlt1Icon />
            </Button>
          </Box>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Display Name</TableCell>
                <TableCell sx={{ width: '20%', textAlign: 'center' }}>Change Display Name</TableCell>
                <TableCell sx={{ width: '20%', textAlign: 'center' }}>Change Password</TableCell>
                <TableCell sx={{ width: '20%', textAlign: 'center' }}>Orphan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              { this.state.family.map((m) => {
                if (m.uuid !== this.props.my_uuid) {
                  return (
                    <TableRow>
                      <TableCell>{m.username}</TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell
                        sx={{ textAlign: 'center'}}
                      >
                        <Button
                          title='Change Display Name'
                          size='small'
                          variant='contained'
                          sx={{
                            width: '125px',
                          }}
                          color="primary"
                        >
                          <DriveFileRenameOutlineIcon fontSize='small' />
                        </Button>
                      </TableCell>
                      <TableCell
                        sx={{ textAlign: 'center'}}
                      >
                        <Button
                          title='Change Password'
                          size='small'
                          variant='contained'
                          sx={{
                            width: '125px',
                          }}
                          color="warning"
                        >
                          <PasswordIcon fontSize='small' />
                        </Button>
                      </TableCell>
                      <TableCell
                        sx={{ textAlign: 'center'}}
                      >
                        <Button
                          title='Orphan'
                          size='small'
                          variant='contained'
                          sx={{
                            width: '125px',
                          }}
                          color="error"
                        >
                          <TimeToLeaveIcon fontSize='small' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }
              })}
            </TableBody>
          </Table>
        </Grid>
      </Grid>
      </>
    )
  }
}
