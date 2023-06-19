import React, { Component } from 'react';

import UserContext from '../lib/Context';
import Header from './common/Header';
import { Box, Button, Checkbox, Collapse, Container, FormControl, FormControlLabel, Grid, MenuItem, Modal, Paper, Select, TextField, Typography } from '@mui/material';

import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';

import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import AddIcon from '@mui/icons-material/Add';

import StarIcon from '@mui/icons-material/Star';

import { differenceInMinutes, format } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import PersonOverview from './PersonOverview';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';

import { v4 as uuidv4 } from 'uuid';

export default class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chores: [],
      errors: [],
      expanded_chore: {},
      expanded_person: {},
      expanded_pending: {},
      family: [],
      family_name: '',
      jwt : window.localStorage.getItem('token') || '',
      loaded: false,
      modal_data: null,
      modal_deadline: false,
      modal_error: false,
      modal_open: false,
      name: '',
      parent: false,
      pendingChores: [],
      sort: 'd',
    };

    this.defaultColDef = {
      minWidth: 150,
      flexGrow: 1,
      sortable: false,
      filter: true,
    };

    this.modalAssignRef = React.createRef(null);
    this.modalDeadlineRef = React.createRef(null);
    this.modalDescriptionRef = React.createRef(null);
    this.modalTitleRef = React.createRef(null);

    // Bind
    this.editPersonChores = this.editPersonChores.bind(this);
    this.expandChore = this.expandChore.bind(this);
    this.expandPending = this.expandPending.bind(this);
    this.expandPersonChores = this.expandPersonChores.bind(this);
    this.getMyChores = this.getMyChores.bind(this);
    this.getMyFamily = this.getMyFamily.bind(this);
    this.getMyInfo = this.getMyInfo.bind(this);
    this.getPendingChores = this.getPendingChores.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.load = this.load.bind(this);
    this.markVerified = this.markVerified.bind(this);
    this.permCheck = this.permCheck.bind(this);
    this.saveChore = this.saveChore.bind(this);
    this.toggleChore = this.toggleChore.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.updateErrors = this.updateErrors.bind(this);
  }
  static contextType = UserContext;

  async componentDidMount() {
    this.load();
  }

  editPersonChores(chore) {
    let modal_deadline = false;
    if (chore.chore_deadline) modal_deadline = true;
    this.setState({ modal_data: chore, modal_deadline }, () => {
      this.toggleModal(true);
    });
  }

  expandChore(uuid) {
    const { expanded_chore } = this.state;
    expanded_chore[uuid] = !expanded_chore[uuid];
    this.setState({ expanded_chore });
  }

  expandPending(uuid) {
    const { expanded_pending } = this.state;
    expanded_pending[uuid] = !expanded_pending[uuid];
    this.setState({ expanded_pending });
  }

  expandPersonChores(uuid) {
    const { expanded_person } = this.state;
    expanded_person[uuid] = !expanded_person[uuid];
    this.setState({ expanded_person });
  }

  async getMyChores() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/mychores`;
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
          await this.updateErrors(data.message);
        }
        resolve(data.message);
      } else {
        this.context.logout();
      }
    });
  }

  async getMyFamily() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/myfamily`;
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
          await this.updateErrors(data.message);
        }
        const sorted = data.message.sort((a, b) => {
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;
        })
        resolve(sorted);
      } else {
        this.context.logout();
      }
    });
  }

  async getMyInfo() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/myinfo`;
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
          await this.updateErrors(data.message);
        }
        console.log({data});
        resolve({ name: data.message.name, family_name: data.message.family_name });
      } else {
        this.context.logout();
      }
    });
  }

  async getPendingChores() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/pendingchores`;
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
          await this.updateErrors(data.message);
        }
        resolve(data.message);
      } else {
        this.context.logout();
      }
    });
  }

  handleSortChange(e) {
    this.setState({ sort: e.target.value }, () => {
      this.setState({ chores: this.sort(this.state.chores)});
    });
  }

  async load() {
    const { expanded_chore, expanded_person, expanded_pending } = this.state;
    let parent = await this.permCheck();
    parent = parent === 'yes' ? true : false;
    let family = [];
    let pendingChores = [];
    if (parent) {
      family = await this.getMyFamily();
      for (const person of family) {
        const id = person.uuid;
        if (id in expanded_person) {
          expanded_person[id] = expanded_person[id];
        } else {
          expanded_person[id] = false;
        }
      }
      pendingChores = await this.getPendingChores();
      pendingChores = pendingChores ? pendingChores.sort((a, b) => {
        if (a.chore_name > b.chore_name) return 1;
        if (a.chore_name < b.chore_name) return -1;
        return 0;
      })
      : [];
      for (const chore of pendingChores) {
        const id = chore.chore;
        if (id in expanded_pending) {
          expanded_pending[id] = expanded_pending[id];
        } else {
          expanded_pending[id] = false;
        }
      }
    }
    const chores = this.sort(await this.getMyChores());
    for (const chore of chores) {
      const id = chore.chore;
      if (id in expanded_chore) {
        expanded_chore[id] = expanded_chore[id];
      } else {
        expanded_chore[id] = false;
      }
    }
    const { name, family_name } = await this.getMyInfo();
    this.setState({ parent, family, pendingChores, expanded_pending, name, family_name, chores, loaded: true, expanded_chore, expanded_person });
  }

  async markVerified(uuid) {
    if (uuid) {
      const url = `${this.context.origin}/verifychore`;
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
        const data = await resp.json();
        if (data.status === 500) {
          await this.updateErrors(data.message);
        }
        await this.load();
      } else {
        this.context.logout();
      }
    }
  }

  async permCheck() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/perm`;
      const options = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': this.state.jwt,
        }
      };
      const resp = await fetch(url, options);
      console.log(resp);
      if (resp.status === 200) {
        const data = await resp.json();
        if (data.status === 500) {
          await this.updateErrors(data.message);
        }
        resolve(data.message);
      } else {
        this.context.logout();
      }
    });
  }

  async saveChore() {
    return new Promise(async (resolve, reject) => {
      const assigned = this.modalAssignRef.current.value;
      const chore_name = this.modalTitleRef.current.value;
      const chore_description = this.modalDescriptionRef.current.value;
      const deadline = this.modalDeadlineRef.current.value || null;
      const chore_id = this.state.modal_data?.chore || null;
      if(!chore_name || chore_name === '') {
        this.setState({ modal_error: true }, () => {
          resolve(false);
          return;
        });
      } else {
        const url = `${this.context.origin}/chore`;
        const options = {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Authorization': this.state.jwt,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assigned,
            chore_name,
            chore_description,
            deadline,
            chore_id,
          }),
        };
        const resp = await fetch(url, options);
        if (resp.status === 200) {
          const data = await resp.json();
          if (data.status === 500) {
            await this.updateErrors(data.message);
          }
          resolve(true);
          return;
        } else {
          this.context.logout();
        }
      }
    });
  }

  sort(chores) {
    const sorted = chores.sort((a, b) => {
      const { sort } = this.state;
      let ret = 0;
      if (sort === 'c') {
        if (a.chore_assigned < b.chore_assigned) {
          ret = -1;
        } else if (a.chore_assigned > b.chore_assigned) {
          ret = 1;
        }
      } else if (sort === 'd') {
        if (a.chore_deadline === b.chore_deadline) {
          ret = 0;
        }
        // nulls sort after anything else
        if (a.chore_deadline === null) {
            ret = 1;
        }
        if (b.chore_deadline === null) {
            ret = -1;
        }
        ret = a.chore_deadline < b.chore_deadline ? -1 : 1;
      }
      return ret;
    });
    return sorted;
  }

  async toggleChore(uuid, bool) {
    bool = Boolean(bool);
    if (uuid) {
      const url = `${this.context.origin}/togglechore`;
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
          bool,
        }),
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const data = await resp.json();
        if (data.status === 500) {
          await this.updateErrors(data.message);
        }
        await this.load();
      } else {
        this.context.logout();
      }
    }
  }

  toggleModal(bool = false) {
    if (bool) {
      this.setState({ modal_open: bool });
    } else {
      this.setState({ modal_open: bool, modal_data: null, modal_deadline: false });
    }
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

  render() {
    return (
      <>
        { this.state.loaded && (
          <>
            <Header
              family={this.state.family_name}
              display={this.state.name}
            />
            <Container maxWidth='large' sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} lg={3}>
                  { this.state.parent && (
                    <Paper
                      sx={{
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #DDD',
                          mb: 1,
                          height: '59px'
                        }}
                      >
                        <Typography variant='h6'><b>Overview</b></Typography>
                        <FormControl sx={{ m: 1 }} size='small'>
                          <Button
                            variant='outlined'
                            color='primary'
                            size='small'
                            onClick={() => {
                              this.toggleModal(true);
                            }}
                          ><AddIcon /></Button>
                        </FormControl>
                      </Box>
                      { this.state.family.length > 0 && this.state.family.map((person, i) => {
                        const { name, family_permission, incomplete, uuid: id } = person;
                          return (
                            <React.Fragment key={id}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  bgcolor: 'primary.main',
                                  pl: 2,
                                  pr: 2,
                                  pt: 1,
                                  pb: 1,
                                  borderBottom: i + 1 !== this.state.family.length ? '1px solid #DDD' : '',
                                }}
                                onClick={() => {
                                  this.expandPersonChores(id);
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    color: this.context.theme === 'light' ? 'white' : 'black',
                                    alignItems: 'center',
                                    height: '100%',
                                  }}
                                >
                                  { this.state.expanded_person[id]
                                    ? (
                                      <ExpandLessIcon />
                                    )
                                    : (
                                      <ExpandMoreIcon />
                                    )
                                  }
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    { name }
                                    { family_permission && family_permission === 'P' && (
                                      <StarIcon
                                        sx={{
                                          color: 'gold',
                                          fontSize: '12px',
                                        }}
                                      />
                                    )}
                                  </Box>
                                </Box>
                                { typeof incomplete !== 'undefined' && (
                                  <span style={{ color: this.context.theme === 'light' ? 'white' : 'black' }}>{incomplete}</span>
                                )}
                              </Box>
                              { this.state.expanded_person[id] && (
                                  <PersonOverview uuid={id} edit={this.editPersonChores} />
                                )
                              }
                            </React.Fragment>
                          );
                      })}
                    </Paper>
                  )}
                </Grid>
                <Grid item xs={12} lg={6}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Paper
                        sx={{
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #DDD',
                            mb: 1,
                            height: '58px',
                          }}
                        >
                          <Typography variant='h6'><b>My Chores</b></Typography>
                          <FormControl sx={{ m: 1 }} size='small'>
                            <Select
                              sx={{ width: '200px' }}
                              value={this.state.sort}
                              onChange={(e) => {
                                this.handleSortChange(e)
                              }}
                              size='small'
                            >
                              <MenuItem value={'d'}>Deadline</MenuItem>
                              <MenuItem value={'c'}>Assigned</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                        { this.state.chores.length > 0 && this.state.chores.map((chore, i) => {
                          const id = chore.chore;
                          const { chore_completed } = chore;
                          const color = chore_completed ? 'warning' : 'success';
                          let deadline_color = '#c9fd96';
                          if (chore.chore_deadline) {
                            const now = new Date();
                            const diff = differenceInMinutes(new Date(chore.chore_deadline), now);
                            if (diff < 30) deadline_color = '#FDFD96';
                            if (diff < 15) deadline_color = '#fdca96';
                            if (diff <= 0) deadline_color = '#fd9796';
                          }
                          return (
                            <Box key={id}
                              sx={{
                                borderLeft: this.state.expanded_chore[id] ? '1px solid #DDD' : '',
                                borderRight: this.state.expanded_chore[id] ? '1px solid #DDD' : '',
                                borderBottom: this.state.expanded_chore[id] ? '1px solid #DDD' : '',
                                mb: this.state.expanded_chore[id] ? 1 : 0,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  bgcolor: 'primary.main',
                                  pl: 2,
                                  pr: 2,
                                  pt: 1,
                                  pb: 1,
                                  borderBottom: i + 1 !== this.state.chores.length ? '1px solid #DDD' : '',
                                }}
                                onClick={() => {
                                  this.expandChore(id);
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    color: this.context.theme === 'light' ? 'white' : 'black',
                                    alignItems: 'center',
                                    height: '100%',
                                  }}
                                >
                                  { this.state.expanded_chore[id]
                                    ? (
                                      <ExpandLessIcon />
                                    )
                                    : (
                                      <ExpandMoreIcon />
                                    )
                                  }
                                  <Box
                                    sx={{
                                      height: '10px',
                                      width: '10px',
                                      borderRadius: '50%',
                                      bgcolor: deadline_color,
                                    }}
                                  />
                                  <b>{ chore.chore_name.toUpperCase() }</b>
                                </Box>
                                <Button variant='contained' size='small'
                                  sx={{
                                    minWidth: 0,
                                  }}
                                  title={
                                    chore.chore_completed
                                      ? 'Mark Incomplete'
                                      : 'Mark Complete'
                                  }
                                  color={color}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    this.toggleChore(id, Boolean(chore.chore_completed));
                                  }}
                                >
                                  { chore.chore_completed
                                    ? (
                                      <UndoIcon sx={{ fontSize: '12px' }} />
                                    )
                                    : (
                                      <CheckIcon sx={{ fontSize: '12px' }} />
                                    )
                                  }
                                </Button>
                              </Box>
                              <Collapse
                                in={this.state.expanded_chore[id]}
                              >
                                <Grid container spacing={0}
                                  sx={{ p: 2 }}
                                >
                                  <Grid item xs={12} md={4}
                                    sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <b>Assigned:</b>
                                    { format(new Date(chore.chore_assigned), 'yyyy-MM-dd hh:mm aa') }
                                  </Grid>
                                  <Grid item xs={12} md={4}
                                    sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <b>Deadline:</b>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                      }}
                                    >
                                      <Box
                                      sx={{
                                        height: '10px',
                                        width: '10px',
                                        borderRadius: '50%',
                                        bgcolor: deadline_color,
                                        border: '1px solid #DDD',
                                      }}
                                    />
                                    
                                    { chore.chore_deadline ? format(new Date(chore.chore_deadline), 'yyyy-MM-dd hh:mm aa') : 'No Deadline' }
                                    </Box>
                                  </Grid>
                                  <Grid item xs={12} md={4}
                                    sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <b>Status:</b>
                                    { chore.chore_completed
                                      ? 'PENDING REVIEW'
                                      : 'ASSIGNED'
                                    }
                                  </Grid>
                                  <Grid item xs={12}>
                                    <b>Details:</b>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <TextField
                                      fullWidth
                                      disabled
                                      value={chore.chore_description ? chore.chore_description : '-'}
                                      multiline
                                      rows={
                                        chore.chore_description.split('\n').length > 4
                                        ? chore.chore_description.split('\n').length <= 8
                                          ? chore.chore_description.split('\n').length
                                          : 8
                                        : 4
                                      }
                                    />
                                  </Grid>
                                </Grid>
                              </Collapse>
                            </Box>
                          );
                        })}
                        { this.state.chores.length === 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '1rem',
                            }}
                          >
                            <Typography variant='h6'>No chores assigned at this time.</Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                    { this.state.parent && (
                      <Grid item xs={12}>
                        <Paper
                          sx={{
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #DDD',
                              mb: 1,
                              height: '58px',
                            }}
                          >
                            <Typography variant='h6'><b>Pending Review</b></Typography>
                          </Box>
                          { this.state.pendingChores.length > 0 && this.state.pendingChores.map((chore, i) => {
                            const id = chore.chore;
                            const { chore_completed } = chore;
                            const color = chore_completed ? 'warning' : 'success';
                            let deadline_color = '#c9fd96';
                            if (chore.chore_deadline) {
                              const now = new Date();
                              const diff = differenceInMinutes(new Date(chore.chore_deadline), now);
                              if (diff < 30) deadline_color = '#FDFD96';
                              if (diff < 15) deadline_color = '#fdca96';
                              if (diff <= 0) deadline_color = '#fd9796';
                            }
                            return (
                              <Box key={id}
                                sx={{
                                  borderLeft: this.state.expanded_pending[id] ? '1px solid #DDD' : '',
                                  borderRight: this.state.expanded_pending[id] ? '1px solid #DDD' : '',
                                  borderBottom: this.state.expanded_pending[id] ? '1px solid #DDD' : '',
                                  mb: this.state.expanded_pending[id] ? 1 : 0,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    bgcolor: 'primary.main',
                                    pl: 2,
                                    pr: 2,
                                    pt: 1,
                                    pb: 1,
                                    borderBottom: i + 1 !== this.state.pendingChores.length ? '1px solid #DDD' : '',
                                  }}
                                  onClick={() => {
                                    this.expandPending(id);
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      gap: '0.5rem',
                                      color: this.context.theme === 'light' ? 'white' : 'black',
                                      alignItems: 'center',
                                      height: '100%',
                                    }}
                                  >
                                    { this.state.expanded_pending[id]
                                      ? (
                                        <ExpandLessIcon />
                                      )
                                      : (
                                        <ExpandMoreIcon />
                                      )
                                    }
                                    <Box
                                      sx={{
                                        height: '10px',
                                        width: '10px',
                                        borderRadius: '50%',
                                        bgcolor: deadline_color,
                                      }}
                                    />
                                    <b>{ chore.chore_name.toUpperCase() }</b>
                                  </Box>
                                  <Button variant='contained' size='small'
                                    sx={{
                                      minWidth: 0,
                                    }}
                                    title={
                                      chore.chore_verified
                                        ? 'Mark Incomplete'
                                        : 'Mark Complete'
                                    }
                                    color='success'
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      this.markVerified(id, Boolean(chore.chore_verified));
                                    }}
                                  >
                                    <CheckIcon sx={{ fontSize: '12px' }} />
                                  </Button>
                                </Box>
                                <Collapse
                                  in={this.state.expanded_pending[id]}
                                >
                                  <Grid container spacing={0}
                                    sx={{ p: 2 }}
                                  >
                                    <Grid item xs={12} md={4}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                      }}
                                    >
                                      <b>Assigned:</b>
                                      { format(new Date(chore.chore_assigned), 'yyyy-MM-dd hh:mm aa') }
                                    </Grid>
                                    <Grid item xs={12} md={4}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                      }}
                                    >
                                      <b>Deadline:</b>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                        }}
                                      >
                                        <Box
                                        sx={{
                                          height: '10px',
                                          width: '10px',
                                          borderRadius: '50%',
                                          bgcolor: deadline_color,
                                          border: '1px solid #DDD',
                                        }}
                                      />
                                      
                                      { chore.chore_deadline ? format(new Date(chore.chore_deadline), 'yyyy-MM-dd hh:mm aa') : 'No Deadline' }
                                      </Box>
                                    </Grid>
                                    <Grid item xs={12} md={4}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                      }}
                                    >
                                      <b>Status:</b>
                                      { chore.chore_completed
                                        ? 'PENDING REVIEW'
                                        : 'ASSIGNED'
                                      }
                                    </Grid>
                                    <Grid item xs={12}>
                                      <b>Details:</b>
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        fullWidth
                                        disabled
                                        value={chore.chore_description ? chore.chore_description : '-'}
                                        multiline
                                        rows={
                                          chore.chore_description.split('\n').length > 4
                                          ? chore.chore_description.split('\n').length <= 8
                                            ? chore.chore_description.split('\n').length
                                            : 8
                                          : 4
                                        }
                                      />
                                    </Grid>
                                  </Grid>
                                </Collapse>
                              </Box>
                            );
                          })}
                          { this.state.pendingChores.length === 0 && (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1rem',
                              }}
                            >
                              <Typography variant='h6'>No chores pending review at this time.</Typography>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
                <Grid item xs={12} lg={3}></Grid>
              </Grid>
            </Container>
          </>
        )}
        { this.state.modal_open && (
          <Modal
            open={this.state.modal_open}
            onClose={() => this.toggleModal()}
          >
            <Container maxWidth='sm'
              sx={{
                display: 'flex',
                alignItems: 'center',
                height: '100vh',
              }}
            >
              <Paper
                sx={{
                  p: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  width: '100%',
                  minHeight: '100px',
                  maxHeight: 'calc(100vh - 100px)',
                  overflowY: 'auto',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #DDD',
                    alignItems: 'center',
                    pb: 1,
                  }}
                >
                  <Typography variant='h6'
                  >{ this.state.modal_data ? 'Edit' : 'Add' } Chore</Typography>
                  <Button
                    color='error'
                    variant='text'
                    onClick={() => {
                      this.toggleModal();
                    }}
                  >Close</Button>
                </Box>
                <b>Assign To:<span style={{color: 'red'}}>*</span></b>
                <Select
                  inputRef={this.modalAssignRef}
                  defaultValue={ this.state.modal_data?.chore_member ? this.state.modal_data?.chore_member : this.state.family[0]?.uuid}
                >
                  { this.state.family.map((person) => {
                    const { name, uuid } = person;
                    return (
                      <MenuItem key={uuid} value={uuid}>{name}</MenuItem>
                    );
                  })}
                </Select>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <b>Deadline (optional):</b>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={this.state.modal_deadline}
                        onChange={(e) => {
                          this.setState({ modal_deadline: e.target.checked }, () => {
                            if (!this.state.modal_deadline) this.modalDeadlineRef.current.value = null;
                          });
                        }}
                      />
                    }
                    label="Has Deadline"
                  />
                </Box>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker inputRef={this.modalDeadlineRef}
                    defaultValue={this.state.modal_data?.chore_deadline ? new Date(this.state.modal_data.chore_deadline) : null }
                    disabled={!this.state.modal_deadline}
                  />
                </LocalizationProvider>
                <b>Chore (max length: 20):<span style={{color: 'red'}}>*</span></b>
                <TextField
                  inputRef={this.modalTitleRef}
                  defaultValue={ this.state.modal_data?.chore_name ? this.state.modal_data?.chore_name : '' }
                  inputProps={{
                    maxLength: 20,
                  }}
                  error={this.state.modal_error}
                  helperText={this.state.modal_error ? 'Required' : '' }
                />
                <b>Chore Description (optional):</b>
                <TextField
                  inputRef={this.modalDescriptionRef}
                  defaultValue={ this.state.modal_data?.chore_description ? this.state.modal_data?.chore_description : '' }
                  multiline
                  rows={4}
                />
                <Button
                  fullWidth
                  color='primary'
                  variant='contained'
                  size='small'
                  onClick={async () => {
                    const cont = await this.saveChore();
                    if (cont) {
                      window.location.reload();
                    }
                  }}
                >Save</Button>
              </Paper>
            </Container>
          </Modal>
        )}
        { this.state.errors.length && (
          <>
            { JSON.stringify(this.state.errors) }
          </>
        )}
      </>
    )
  }
}
