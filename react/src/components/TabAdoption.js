import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
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
import { format } from "date-fns";

import ChildFriendlyIcon from "@mui/icons-material/ChildFriendly";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import UserContext from "../lib/Context";

export default class TabAdoption extends Component {
  constructor(props) {
    super(props);
    this.state = {
      adoptionCodes: [],
      modal: false,
      intendedPerson: {
        error: false,
        value: "",
        helperText: "",
      },
      permission: "",
    };

    // Bind
    this.load = this.load.bind(this);
    this.getAdoptionCodes = this.getAdoptionCodes.bind(this);
    this.generateAdoptionCode = this.generateAdoptionCode.bind(this);
    this.toggleAdoptionModal = this.toggleAdoptionModal.bind(this);
  }

  static contextType = UserContext;

  componentDidMount() {
    this.load();
  }

  toggleAdoptionModal() {
    const { modal, intendedPerson } = this.state;
    if (modal) {
      intendedPerson.value = "";
      intendedPerson.error = false;
      intendedPerson.helperText = "";
    }
    this.setState({ modal: !modal });
  }

  async load() {
    const myInfo = await this.context.getMyInfo();
    if (myInfo.permission && myInfo.permission === "P") {
      let adoptionCodes = [];
      adoptionCodes = await this.getAdoptionCodes();

      this.setState({ adoptionCodes });
    }
  }

  async getAdoptionCodes() {
    return new Promise(async (resolve, reject) => {
      const url = `${this.context.origin}/adoptioncodes`;
      const options = {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
          Authorization: this.context.jwt,
        },
      };
      const resp = await fetch(url, options);
      if (resp.status === 200) {
        const data = await resp.json();
        if (data.status === 500) {
          await this.context.updateErrors(data.message);
        }
        resolve(data.message);
      } else {
        this.context.logout();
      }
    });
  }

  async generateAdoptionCode() {
    const { permission, intendedPerson } = this.state;
    if (intendedPerson === "") {
      intendedPerson.error = true;
      intendedPerson.helperText = "Name is required";
      this.setState({ intendedPerson });
    } else {
      return new Promise(async (resolve, reject) => {
        const url = `${this.context.origin}/generateadoptioncode`;
        const options = {
          method: "POST",
          mode: "cors",
          cache: "no-cache",
          headers: {
            Authorization: this.context.jwt,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intended: intendedPerson.value,
            permission: permission,
          }),
        };
        const resp = await fetch(url, options);
        if (resp.status === 200) {
          const data = await resp.json();
          if (data.status === 500) {
            await this.context.updateErrors(data.message);
          }
          const adoptionCodes = await this.getAdoptionCodes();
          this.setState({ adoptionCodes });
          this.toggleAdoptionModal();
          resolve();
        } else {
          this.context.logout();
        }
      });
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
                <b>Adoption Settings</b>
              </Typography>
              <Button
                title="Adopt"
                onClick={() => {
                  this.toggleAdoptionModal();
                }}
              >
                <ChildFriendlyIcon />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      width: "20%",
                    }}
                  >
                    Intended Adoption
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "5%",
                    }}
                  >
                    Permission
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "20%",
                    }}
                  >
                    Generated
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "40%",
                    }}
                  >
                    Adoption Code
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "15%",
                      textAlign: "center",
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {this.state.adoptionCodes.length ? (
                  <>
                    {this.state.adoptionCodes.map((c) => {
                      return (
                        <TableRow>
                          <TableCell>{c.intended}</TableCell>
                          <TableCell>
                            {c.permission ? "Parent" : "Child"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(c.generated), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              readOnly
                              value={c.adoption_code}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              fullWidth
                            >
                              <DeleteForeverIcon />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" align="center">
                        <i>No pending adoptions</i>
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Grid>
        </Grid>
        {this.state.modal && (
          <Modal
            open={this.state.modal}
            onClose={() => this.toggleAdoptionModal()}
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
                  <Typography variant="h6">Generate Adoption Code</Typography>
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => {
                      this.toggleAdoptionModal();
                    }}
                  >
                    Close
                  </Button>
                </Box>

                <b>
                  Intended Person:<span style={{ color: "red" }}>*</span>
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
                    error={this.state.intendedPerson.error}
                    value={this.state.intendedPerson.value}
                    helperText={this.state.intendedPerson.helper}
                    inputProps={{
                      maxLength: 20,
                    }}
                    onChange={(e) => {
                      const { value } = e.target;
                      const { intendedPerson } = this.state;
                      intendedPerson.value = value;
                      this.setState({ intendedPerson });
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={this.state.permission}
                        onChange={(e) => {
                          this.setState({ permission: e.target.checked });
                        }}
                      />
                    }
                    label="Parent"
                  />
                </Box>
                <Button
                  fullWidth
                  color="primary"
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    this.generateAdoptionCode();
                  }}
                >
                  Generate
                </Button>
              </Paper>
            </Container>
          </Modal>
        )}
      </>
    );
  }
}
