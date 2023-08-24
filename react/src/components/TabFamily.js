import {
  Box,
  Button,
  Container,
  Grid,
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { Component } from "react";
import UserContext from "../lib/Context";
import PropTypes from "prop-types";

// Icons
import PasswordIcon from "@mui/icons-material/Password";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import TimeToLeaveIcon from "@mui/icons-material/TimeToLeave";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

export default class TabFamily extends Component {
  constructor(props) {
    super(props);
    this.state = {
      parent: false,
      family: [],
      displayNameModal: false,
      passwordModal: false,
      orphanModal: false,
      person: null,
    };

    // Bind
    this.load = this.load.bind(this);
    this.toggleDisplayNameModal = this.toggleDisplayNameModal.bind(this);
    this.changeDisplayName = this.changeDisplayName.bind(this);
    this.togglePasswordModal = this.togglePasswordModal.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.toggleOrphanModal = this.toggleOrphanModal.bind(this);
    this.orphan = this.orphan.bind(this);

  }

  static contextType = UserContext;
  static propTypes = {
    my_uuid: PropTypes.string.isRequired,
  };

  componentDidMount() {
    this.load();
  }

  async load() {
    let parent = await this.context.permCheck();
    parent = parent === "yes" ? true : false;
    let family = [];
    if (parent) {
      family = await this.context.getMyFamily();
    }
    this.setState({ parent, family });
  }

  toggleDisplayNameModal(person = null) {
    const { displayNameModal } = this.state;
    this.setState({ displayNameModal: !displayNameModal, person });
  }

  togglePasswordModal(person = null) {
    const { passwordModal } = this.state;
    this.setState({ passwordModal: !passwordModal, person });
  }

  toggleOrphanModal(person = null) {
    const { orphanModal } = this.state;
    this.setState({ orphanModal: !orphanModal, person });
  }

  async orphan() {
    const { person } = this.state;
    const res = await this.context.orphan(person.uuid);
    if (res === "ok") {
      this.toggleOrphanModal();
      this.load();
    } else {
      person.error = true;
      this.setState({ person });
    }
  }

  async changeDisplayName() {
    const { person } = this.state;
    if (person.new_name.length < 1 || person.new_name.length > 32) {
      person.error = true;
      this.setState({ person });
      return;
    }
    const res = await this.context.changeDisplayName(person.uuid, person.new_name);
    if (res === "ok") {
      this.toggleDisplayNameModal();
      this.load();
    } else {
      person.error = true;
      this.setState({ person });
    }
  }

  async changePassword() {
    const { person } = this.state;
    if (person.password.length < 1 || person.password.length > 32) {
      person.error = true;
      this.setState({ person });
      return;
    }
    const res = await this.context.changePassword(person.uuid, person.password);
    if (res === "ok") {
      this.togglePasswordModal();
    } else {
      person.error = true;
      this.setState({ person });
    }
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
            <Box
              sx={{
                borderBottom: "1px solid #DDD",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6">
                <b>Family Settings</b>
              </Typography>
              <Button>
                <PersonAddAlt1Icon />
              </Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Display Name</TableCell>
                  <TableCell sx={{ width: "20%", textAlign: "center" }}>
                    Change Display Name
                  </TableCell>
                  <TableCell sx={{ width: "20%", textAlign: "center" }}>
                    Change Password
                  </TableCell>
                  <TableCell sx={{ width: "20%", textAlign: "center" }}>
                    Orphan
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {this.state.family.map((m) => {
                  if (m.uuid !== this.props.my_uuid) {
                    return (
                      <TableRow
                        key={m.uuid}
                      >
                        <TableCell>{m.username}</TableCell>
                        <TableCell>{m.name}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Button
                            title="Change Display Name"
                            size="small"
                            variant="contained"
                            sx={{
                              width: "125px",
                            }}
                            color="primary"
                            onClick={() => {
                              this.toggleDisplayNameModal(m);
                            }}
                          >
                            <DriveFileRenameOutlineIcon fontSize="small" />
                          </Button>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Button
                            title="Change Password"
                            size="small"
                            variant="contained"
                            sx={{
                              width: "125px",
                            }}
                            color="warning"
                            onClick={() => {
                              this.togglePasswordModal(m);
                            }}
                          >
                            <PasswordIcon fontSize="small" />
                          </Button>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Button
                            title="Orphan"
                            size="small"
                            variant="contained"
                            sx={{
                              width: "125px",
                            }}
                            color="error"
                            onClick={() => {
                              this.toggleOrphanModal(m);
                            }}
                          >
                            <TimeToLeaveIcon fontSize="small" />
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
        { this.state.person && (
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
                  New Display Name for <small>{this.state.person.name}</small>:<span style={{ color: "red" }}>*</span>
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
                    error={this.state.person.error}
                    value={this.state.person.new_name ? this.state.person.new_name : ""}
                    helperText={this.state.person.error ? "Invalid Name || Server Error" : null}
                    inputProps={{
                      maxLength: 32,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { person } = this.state;
                      person.new_name = value;
                      this.setState({ person });
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

        { this.state.person && (
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
                  New Password for <small>{this.state.person.name}</small>:<span style={{ color: "red" }}>*</span>
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
                    error={this.state.person.error}
                    value={this.state.person.password ? this.state.person.password : ''}
                    helperText={this.state.person.error ? "Invalid Password || Server Error" : null}
                    inputProps={{
                      maxLength: 32,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { person } = this.state;
                      person.password = value;
                      this.setState({ person });
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
              </Paper>
            </Container>
          </Modal>
        )}

        { this.state.person && (
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
                  <Typography variant="h6">Orphan Family Memeber</Typography>
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
                  Orphan <small>{this.state.person.name}</small>?:<span style={{ color: "red" }}>*</span>
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
                    error={this.state.person.confirmed ? !this.state.person.confirmed : true}
                    value={this.state.person.orphan ? this.state.person.orphan : ''}
                    placeholder="Type 'orphan' to confirm"
                    inputProps={{
                      maxLength: 6,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { person } = this.state;
                      person.orphan = value;
                      if (value === 'orphan') {
                        person.confirmed = true;
                      }
                      this.setState({ person });
                    }}
                  />
                </Box>
                <Button
                  fullWidth
                  color="primary"
                  variant="contained"
                  size="small"
                  disabled={!this.state.person.confirmed}
                  onClick={async () => {
                    this.orphan();
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
