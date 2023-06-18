import React, { Component } from 'react';

import UserContext from '../lib/Context';
import Header from './common/Header';
import { Box, Button, Checkbox, Collapse, Container, FormControl, FormControlLabel, Grid, MenuItem, Modal, Paper, Select, TextField, Typography } from '@mui/material';

import Image from '../lib/Images';

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

export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      jwt : window.localStorage.getItem('token') || '',
      me : window.localStorage.getItem('me') ? JSON.parse(window.localStorage.getItem('me')) : '',
      family: [],
      chores: [],
      expanded: {},
      expanded_person: {},
      sort: 'd',
      loaded: false,
      modal_open: false,
      modal_data: null,
      modal_error: false,
      modal_deadline: false,
    };

    this.defaultColDef = {
      minWidth: 150,
      flexGrow: 1,
      sortable: false,
      filter: true,
    };

    this.modalAssignRef = React.createRef(null);
    this.modalTitleRef = React.createRef(null);
    this.modalDescriptionRef = React.createRef(null);
    this.modalDeadlineRef = React.createRef(null);

    // Bind
    this.getMyChores = this.getMyChores.bind(this);
    this.getMyFamily = this.getMyFamily.bind(this);
    this.toggleChore = this.toggleChore.bind(this);
    this.expandChore = this.expandChore.bind(this);
    this.expandPersonChores = this.expandPersonChores.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.editPersonChores = this.editPersonChores.bind(this);
    this.saveChore = this.saveChore.bind(this);
  }
  static contextType = UserContext;

  async componentDidMount() {
    const { expanded, expanded_person } = this.state;
    const family = await this.getMyFamily();
    for (const person of family) {
      const id = person.uuid;
      if (id in expanded_person) {
        expanded_person[id] = !expanded_person[id];
      } else {
        expanded_person[id] = false;
      }
    }
    const chores = this.sort(await this.getMyChores());
    for (const chore of chores) {
      const id = chore.chore;
      if (id in expanded) {
        expanded[id] = !expanded[id];
      } else {
        expanded[id] = false;
      }
    }
    this.setState({ family, chores, loaded: true, expanded, expanded_person });
  }
  sort(chores) {
    const sorted = chores.sort((a, b) => {
      const { sort } = this.state;
      let ret = 0;
      if (sort === 'c') {
        if (a.chore_assigned < b.chore_assigned) ret = -1;
        if (a.chore_assigned > b.chore_assigned) ret = 1;
      } else if (sort === 'd') {
        if (a.chore_deadline < b.chore_deadline) ret = -1;
        if (a.chore_deadline > b.chore_deadline) ret = 1;
      } else if (sort === 'o') {
        if (b.chore_completed === null) ret = 1;
        if (a.chore_completed < b.chore_completed) ret = 1;
        if (a.chore_completed > b.chore_completed) ret = -1;
      }
      return ret;
    });
    return sorted;
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
          resolve(true);
          return;
        } else {
          this.context.logout();
        }
      }
    });
  }

  handleSortChange(e) {
    this.setState({ sort: e.target.value }, () => {
      this.setState({ chores: this.sort(this.state.chores)});
    });
  }

  expandChore(uuid) {
    const { expanded } = this.state;
    expanded[uuid] = !expanded[uuid];
    this.setState({ expanded });
  }

  expandPersonChores(uuid) {
    const { expanded_person } = this.state;
    expanded_person[uuid] = !expanded_person[uuid];
    this.setState({ expanded_person });
  }

  editPersonChores(chore) {
    let modal_deadline = false;
    if (chore.chore_deadline) modal_deadline = true;
    this.setState({ modal_data: chore, modal_deadline }, () => {
      this.toggleModal(true);
    });
  }

  toggleModal(bool = false) {
    if (bool) {
      this.setState({ modal_open: bool });
    } else {
      this.setState({ modal_open: bool, modal_data: null, modal_deadline: false });
    }
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
        const chores = this.sort(await this.getMyChores());
        const { expanded } = this.state;
        for (const chore of chores) {
          const id = chore.chore;
          if (!id in expanded) {
            expanded[id] = false;
          }
        }
        this.setState({ chores, expanded });
      } else {
        this.context.logout();
      }
    }
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
        resolve(data.message);
      } else {
        this.context.logout();
      }
    });
  }

  render() {
    console.log(this.state.modal_data, this.state.modal_data?.chore_member);
    return (
      <>
        { this.state.loaded && (
          <>
            <Header
              display={this.state.me.display_name}
            />
            <Container maxWidth='large' sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} lg={3}>
                { this.state.me.acct_type === 'P' && (
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
                      const { name, unit_permission, incomplete, uuid: id } = person;
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
                                  { unit_permission && unit_permission === 'P' && (
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
                          <MenuItem value={'c'}>Created</MenuItem>
                          <MenuItem value={'o'}>Completed</MenuItem>
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
                              { this.state.expanded[id]
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
                                  <UndoIcon />
                                )
                                : (
                                  <CheckIcon />
                                )
                              }
                            </Button>
                          </Box>
                          <Collapse
                            in={this.state.expanded[id]}
                          >
                            <Grid container spacing={0}
                              sx={{ p: 2 }}
                            >
                              <Grid item xs={12} sm={4}>
                                <b>Assigned:</b>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <b>Deadline:</b>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <b>Status:</b>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                { format(new Date(chore.chore_assigned), 'yyyy-MM-dd hh:mm aa') }
                              </Grid>
                              <Grid item xs={12} sm={4}
                                sx={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  alignItems: 'center',
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
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                { chore.chore_completed
                                  ? 'PENDING REVIEW'
                                  : 'ASSIGNED'
                                }
                              </Grid>
                              <Grid item xs={12}>
                                <b>Details:</b>
                              </Grid>
                              <Grid item xs={12}>
                                {chore.chore_description ? chore.chore_description : '-'}
                              </Grid>
                            </Grid>
                          </Collapse>
                        </React.Fragment>
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
                        <Typography variant='h6'>NO CHORES</Typography>
                        <img src={Image.party_time} alt='Party Time!' style={{ borderRadius: '5px' }} />
                      </Box>
                    )}
                  </Paper>
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
              marginTop: '150px',
            }}
          >
            <Paper
              sx={{
                p: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
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
                  size='small'
                  onClick={async () => {
                    const cont = await this.saveChore();
                    if (cont) {
                      window.location.reload();
                    }
                  }}
                >Save</Button>
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
            </Paper>
          </Container>
        </Modal>
        )}
      </>
    )
  }
}
