import React, { Component } from 'react';
import UserContext from '../lib/Context';
import { Box, Container, Grid, Paper, Tab, Tabs, Typography } from '@mui/material';
import Header from './common/Header';
import TabPanel from './common/TabPanel';
import TabFamily from './TabFamily';
import TabAdoption from './TabAdoption';
import TabSettings from './TabSettings';

export default class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      family_name: '',
      name: '',
      uuid: '',
      tab: 0,
      parent: false,
      family: [],
    };

    // Bind
    this.load = this.load.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
  }

  static contextType = UserContext;

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
    const { name, family_name, uuid } = await this.context.getMyInfo();
    this.setState({ parent, family, name, family_name, uuid });
  }

  handleTabChange(e, v) {
    this.setState({ tab: v });
  }

  render() {
    const enableAdoption = (Boolean(!this.state.family_name) || this.state.parent)
    return (
      <>
        <Header
          family={this.state.family_name}
          display={this.state.name}
        />
        <Container maxWidth='large' sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={2}>
              <Paper>
                <Tabs
                  orientation='vertical'
                  value={this.state.tab}
                  onChange={(e, v) => {
                    this.handleTabChange(e, v);
                  }}
                  sx={{
                    borderRight: '1',
                    borderColor: 'divider',
                  }}
                  variant='fullWidth'
                >
                  <Tab label="My Settings" sx={{ borderBottom: '1px solid #DDD' }} />
                  <Tab label="Adoption" sx={{ borderBottom: '1px solid #DDD' }} disabled={!enableAdoption} />
                  { this.state.parent && (
                    <Tab label="Family" />
                  )}
                </Tabs>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={10}>
              <Paper
                sx={{
                  p: 1,
                }}
              >
                <TabPanel value={this.state.tab} index={0}>
                  <TabSettings />
                </TabPanel>
                { enableAdoption && (
                  <TabPanel value={this.state.tab} index={1}>
                    <TabAdoption />
                  </TabPanel>
                )}
                { this.state.parent && (
                  <TabPanel value={this.state.tab} index={2}>
                    <TabFamily my_uuid={this.state.uuid} />
                  </TabPanel>
                )}
              </Paper>
            </Grid>
          </Grid>

        </Container>
      </>
    )
  }
}
