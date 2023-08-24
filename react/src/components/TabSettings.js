import {
  Box,
  Button,
  Container,
  Grid,
  List,
  ListItem,
  Modal,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { Component } from "react";

import UserContext from "../lib/Context";

export default class TabSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      me: {},
      passwordModal: false,
      displayNameModal: false,
      orphanModal: false,
    };

    // Binds
    this.load = this.load.bind(this);
    this.togglePasswordModal = this.togglePasswordModal.bind(this);
    this.toggleDisplayNameModal = this.toggleDisplayNameModal.bind(this);
    this.toggleOrphanModal = this.toggleOrphanModal.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.changeDisplayName = this.changeDisplayName.bind(this);
    this.orphanFamily = this.orphanFamily.bind(this);
  }

  static contextType = UserContext;

  async load() {
    const myinfo = await this.context.getMyInfo();
    this.setState({ me: myinfo });
  }

  togglePasswordModal() {
    this.setState({ passwordModal: !this.state.passwordModal });
  }

  async changePassword(){
    const { me } = this.state;
    if (me.password.length < 1 || me.password.length > 32) {
      me.error = true;
      this.setState({ me });
      return;
    }
    const res = await this.context.changePassword(me.uuid, me.password);
    console.log('res', res);
    if (res === "ok") {
      this.togglePasswordModal();
      this.context.logout();
    } else {
      me.error = true;
      this.setState({ me });
    }
  }

  toggleDisplayNameModal() {
    if (this.state.me.family_permission !== 'P') return;
    this.setState({ displayNameModal: !this.state.displayNameModal });
  }

  async changeDisplayName(){
    const { me } = this.state;
    if (me.new_name.length < 1 || me.new_name.length > 32) {
      me.error = true;
      this.setState({ me });
      return;
    }
    const res = await this.context.changeDisplayName(me.uuid, me.new_name);
    console.log('res', res);
    if (res === "ok") {
      this.toggleDisplayNameModal();
      this.load();
    } else {
      me.error = true;
      this.setState({ me });
    }
  }

  toggleOrphanModal() {
    if (this.state.me.family_permission !== 'P') return;
    this.setState({ orphanModal: !this.state.orphanModal });
  }

  async orphanFamily(){
    const { me } = this.state;
    const res = await this.context.orphanFamily(me.uuid);
    if (res === "ok") {
      this.toggleOrphanModal();
      this.context.logout();
    } else {
      me.error = true;
      this.setState({ me });
    }
  }

  async componentDidMount() {
    await this.load();
  }

  render() {
    return (
      <>
        <Grid container spacing={2}>
          <Grid
            item
            xs={12}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <Typography
              sx={{
                borderBottom: "1px solid #DDD",
              }}
              variant="h6"
            >
              My Settings
            </Typography>
            <Container
              sx={{
                border: "1px solid #DDD",
                borderRadius: "5px",
                padding: "1rem",
                minHeight: "100px",
              }}
              maxWidth="xs"
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0,
                  marginBottom: "1rem",
                }}
              >
                <Box fontWeight='bold'>{ this.state.me.family_name ? this.state.me.family_name : '' }</Box>
                <Box fontWeight='bold'><small>{ this.state.me.name ? this.state.me.name : '' }</small></Box>
              </Box>
              <List
                dense
                sx={{
                  border: '1px solid #DDD',
                  padding: 0,
                }}
              >
                <ListItem
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Button
                    fullWidth
                    size="small"
                    variant="contained"
                    title="Only Parents can Change Display Name"
                    disabled={this.state.me.family_permission !== 'P'}
                    color="warning"
                    onClick={() => this.toggleDisplayNameModal()}
                  >Display Name</Button>
              </ListItem>
              <ListItem>
                  <Button
                    fullWidth
                    size="small"
                    variant="contained"
                    title="Change Password"
                    color="primary"
                    onClick={() => this.togglePasswordModal()}
                  >Password</Button>
                  </ListItem>
              <ListItem>
                  <Button
                    fullWidth
                    size="small"
                    variant="contained"
                    title="Only Parents can Orphan"
                    disabled={this.state.me.family_permission !== 'P'}
                    color="error"
                    onClick={() => this.toggleOrphanModal()}
                  >Orphan</Button>
                </ListItem>
              </List>
            </Container>
          </Grid>
        </Grid>
        { this.state.me && (
          <Modal
            open={this.state.passwordModal}
            onClose={this.togglePasswordModal}
          >
            <Container
              maxWidth="sm"
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100vh",
              }}
            >
              <Paper
                sx={{
                  p: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  width: "100%",
                  minHeight: "100px",
                  maxHeight: "calc(100vh - 100px)",
                  overflowY: "auto",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #DDD",
                    alignItems: "center",
                    pb: 1,
                  }}
                >
                  <Typography variant="h6">Change Password</Typography>
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => {
                      this.togglePasswordModal();
                    }}
                  >
                    Close
                  </Button>
                </Box>

                <b>
                  New Password:<span style={{ color: "red" }}>*</span>
                </b>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <TextField
                    sx={{
                      flexGrow: 1,
                    }}
                    size="small"
                    type='password'
                    error={this.state.me.error}
                    value={this.state.me.password ? this.state.me.password : ''}
                    helperText={this.state.me.error ? "Invalid Password || Server Error" : null}
                    inputProps={{
                      maxLength: 32,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { me } = this.state;
                      me.password = value;
                      this.setState({ me });
                    }}
                  />
                </Box>
                <Button
                  fullWidth
                  color="primary"
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    this.changePassword();
                  }}
                >
                  Save
                </Button>
                <Box
                  sx={{ display: "flex", justifyContent: "center" }}
                >
                  <i><b>Note:</b> Changing password will log you out.</i>
                </Box>
              </Paper>
            </Container>
          </Modal>
        )}

        { this.state.me && (
          <Modal
            open={this.state.displayNameModal}
            onClose={this.toggleDisplayNameModal}
          >
            <Container
              maxWidth="sm"
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100vh",
              }}
            >
              <Paper
                sx={{
                  p: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  width: "100%",
                  minHeight: "100px",
                  maxHeight: "calc(100vh - 100px)",
                  overflowY: "auto",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #DDD",
                    alignItems: "center",
                    pb: 1,
                  }}
                >
                  <Typography variant="h6">Change Display Name</Typography>
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => {
                      this.toggleDisplayNameModal();
                    }}
                  >
                    Close
                  </Button>
                </Box>

                <b>
                  New Display Name:<span style={{ color: "red" }}>*</span>
                </b>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <TextField
                    sx={{
                      flexGrow: 1,
                    }}
                    size="small"
                    error={this.state.me.error}
                    value={this.state.me.new_name ? this.state.me.new_name : ""}
                    helperText={this.state.me.error ? "Invalid Name || Server Error" : null}
                    inputProps={{
                      maxLength: 32,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { me } = this.state;
                      me.new_name = value;
                      this.setState({ me });
                    }}
                  />
                </Box>
                <Button
                  fullWidth
                  color="primary"
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    this.changeDisplayName();
                  }}
                >
                  Save
                </Button>
              </Paper>
            </Container>
          </Modal>
        )}

        { this.state.me && (
          <Modal
            open={this.state.orphanModal}
            onClose={this.toggleOrphanModal}
          >
            <Container
              maxWidth="sm"
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100vh",
              }}
            >
              <Paper
                sx={{
                  p: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  width: "100%",
                  minHeight: "100px",
                  maxHeight: "calc(100vh - 100px)",
                  overflowY: "auto",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #DDD",
                    alignItems: "center",
                    pb: 1,
                  }}
                >
                  <Typography variant="h6">Orphan Whole Family</Typography>
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => {
                      this.toggleOrphanModal();
                    }}
                  >
                    Close
                  </Button>
                </Box>

                <b>
                  Orphan <small>{this.state.me.family_name}</small> members?:<span style={{ color: "red" }}>*</span>
                </b>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <TextField
                    sx={{
                      flexGrow: 1,
                    }}
                    size="small"
                    error={this.state.me.confirmed ? !this.state.me.confirmed : true}
                    value={this.state.me.orphan ? this.state.me.orphan : ''}
                    placeholder="Type 'orphan everyone' to confirm"
                    inputProps={{
                      maxLength: 15,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { me } = this.state;
                      me.orphan = value;
                      if (value === 'orphan everyone') {
                        me.confirmed = true;
                      }
                      this.setState({ me });
                    }}
                  />
                </Box>
                <Button
                  fullWidth
                  color="primary"
                  variant="contained"
                  size="small"
                  disabled={!this.state.me.confirmed}
                  onClick={async () => {
                    this.orphanFamily();
                  }}
                >
                  Orphan
                </Button>
              </Paper>
            </Container>
          </Modal>
        )}
      </>
    );
  }
}
