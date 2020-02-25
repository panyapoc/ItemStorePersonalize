import React, { Component } from "react";
import { Navbar, NavDropdown, NavItem, MenuItem, Nav} from "react-bootstrap";
import { Container } from "react-bootstrap/lib/Tab";
import { BrowserRouter as Router, withRouter, Switch, RouteComponentProps, Route } from "react-router-dom";
import RecommendationList from "./modules/recommendationList/recommendationList";
import notFound from "./modules/notFound/notFound";
import ProductDetail from "./modules/productDetail/productDetail";
import SearchBar from "./modules/searchBar/searchBar";
import uuid, { v4 as uuidv4 } from 'uuid';
import "./App.css";

const userList = [
  {
    id: "AIXZKN4ACSKI",
    lastName: "Dobalina",
    firstName: "Bob"
  },
  {
    id: "A1L5P841VIO02V",
    lastName: "McGee",
    firstName: "Me & Bobby"
  },
  {
    id: "AB2W04NI4OEAD",
    lastName: "Goode",
    firstName: "Johnny B."
  },
  {
    id: "A148SVSWKTJKU6",
    lastName: "Rigby",
    firstName: "Eleanor "
  },
  {
    id: "AAAWJ6LW9WMOO",
    lastName: "Miss Molly",
    firstName: "Good Golly"
  }
];

interface AppProps {
  history: any;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppState {
  selectedUser: User | undefined;
  userSelectedName : string;
  SID : string | null;
}

class App extends Component<RouteComponentProps<AppProps>, AppState> {
  constructor(props: RouteComponentProps<AppProps>) {
    super(props);
    let user = localStorage.getItem('user')
    if(user){
      let userobj = JSON.parse(user)
      this.state = {
        selectedUser: userobj,
        userSelectedName : `${userobj.firstName} ${userobj.lastName}`,
        SID : localStorage.getItem('SID')
      };
    }else{
      this.state = {
        selectedUser: undefined,
        userSelectedName : '',
        SID : null
      };
    }
    this.renderSelectOptions = this.renderSelectOptions.bind(this);
    document.title = "The All Store";
  }


  renderSelectOptions(eventKey : any) {
    console.log('eventKey',eventKey)
    let SID = uuidv4()
    if(eventKey === 'anonymous'){
      this.setState({ userSelectedName: 'anonymous'});
      this.setState({ selectedUser: undefined});
      this.setState({ SID: null});
      localStorage.removeItem('user');
      localStorage.removeItem('SID');
    }else{
      this.setState({
        userSelectedName: `${userList[eventKey].firstName} ${userList[eventKey].lastName}`
      });
      this.setState({ selectedUser: userList[eventKey]});
      localStorage.setItem('user', JSON.stringify(userList[eventKey]));
      localStorage.setItem('SID', SID);
    }
  }

  render() {
    return (
      <div className="App container">

        <Container>
        <Navbar collapseOnSelect>
          <Navbar.Header>
              <Navbar.Brand>
                <a href='/'>
                  <span><img
                  alt=""
                  src="../img/shop.png"
                  width="50"
                  height="50"
                  className="d-inline-block align-top"
                /></span>{' '}
                The All Store - Great Prices, Huge Collection</a>
              </Navbar.Brand>
              <Navbar.Toggle />
            </Navbar.Header>
          <Navbar.Collapse>
            <Nav className="userstate" pullRight>
              <NavItem>
                {`SessionID : ${this.state.SID}`}
              </NavItem>
              <NavDropdown className='loginAs' title={'loginAs: '+this.state.userSelectedName} id="basic-nav-dropdown" onSelect={this.renderSelectOptions}>
                {userList.map((item, key) =>
                  <MenuItem id={`user${key}`} eventKey={key}>{item.firstName +' '+item.lastName }</MenuItem>
                )}
                <MenuItem id='anonymous' eventKey='anonymous'>anonymous</MenuItem>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
          </Navbar>
        </Container>
        <Router>
            <Switch>
              <Route exact path="/">
                <SearchBar
                  userId={this.state.selectedUser?.id}
                  searchid={undefined}>
                </SearchBar>
                <RecommendationList
                  mode="Normal"
                  userId={this.state.selectedUser?.id}>
                </RecommendationList>
              </Route>
              <Route path="/product/:id">
                <SearchBar
                  userId={this.state.selectedUser?.id}
                  searchid={undefined}>
                </SearchBar>
                <ProductDetail
                  uid={this.state.selectedUser?.id}
                  id={"2"}
                ></ProductDetail>
              </Route>
              <Route exact path="/search/:searchid">
                <SearchBar
                  userId={this.state.selectedUser?.id}
                  searchid={undefined}
                ></SearchBar>
                <RecommendationList
                  mode="Normal"
                  userId={this.state.selectedUser?.id}
                ></RecommendationList>
              </Route>
              <Route path="*" component={notFound} />
            </Switch>
        </Router>
      </div>);
  }
}

export default withRouter(App as any);
