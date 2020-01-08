
import React, { Component, Fragment } from "react";
import { LinkContainer } from "react-router-bootstrap";
import { Nav, Navbar, NavItem, Label } from "react-bootstrap";
import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Link,
  withRouter,
  Switch,
  RouteComponentProps,
  Redirect
} from "react-router-dom";
import RecommendationList  from "./modules/recommendationList/recommendationList";
import config from "./config";
import notFound from "./modules/notFound/notFound";
import ProductDetail from "./modules/productDetail/productDetail";
import SearchBar from "./modules/searchBar/searchBar";
import { Select, Input } from '@material-ui/core';
import { MenuItem } from '@material-ui/core';
import queryString from 'query-string'

const bookstoreIcon = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjMycHgiIGhlaWdodD0iMzJweCIgdmlld0JveD0iMCAwIDMzNS4wOCAzMzUuMDc5IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAzMzUuMDggMzM1LjA3OTsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8Zz4KCTxnPgoJCTxwYXRoIGQ9Ik0zMTEuMTc1LDExNS43NzVjLTEuMzU1LTEwLjE4Ni0xLjU0Ni0yNy43Myw3LjkxNS0zMy42MjFjMC4xNjktMC4xMDgsMC4yOTUtMC4yNjQsMC40NDMtMC4zOTggICAgYzcuNzM1LTIuNDc0LDEzLjA4OC01Ljk0Niw4Ljg4Ni0xMC42MThsLTExNC4xMDItMzQuMzhMMjkuNTYsNjIuNDQ1YzAsMC0yMS4xNTcsMy4wMjQtMTkuMjY3LDM1Ljg5NCAgICBjMS4wMjYsMTcuODksNi42MzcsMjYuNjc2LDExLjU0NCwzMWwtMTUuMTYxLDQuNTY5Yy00LjIwOCw0LjY3MiwxLjE0NCw4LjE0NSw4Ljg4LDEwLjYxNWMwLjE0NywwLjEzOCwwLjI3MSwwLjI5MywwLjQ0MywwLjQwMSAgICBjOS40NTUsNS44OTYsOS4yNzMsMjMuNDM4LDcuOTEzLDMzLjYyNmMtMzMuOTY3LDkuNjQ1LTIxLjc3NCwxMi43ODgtMjEuNzc0LDEyLjc4OGw3LjQ1MSwxLjgwMyAgICBjLTUuMjQxLDQuNzM2LTEwLjQ0NiwxMy43MTctOS40NzEsMzAuNzVjMS44OTEsMzIuODY0LDE5LjI2OSwzNS4xMzIsMTkuMjY5LDM1LjEzMmwxMjAuOTA0LDM5LjI5OGwxODIuNDktNDQuMjAyICAgIGMwLDAsMTIuMTk3LTMuMTQ4LTIxLjc3OS0xMi43OTRjLTEuMzY2LTEwLjE3Mi0xLjU1Ni0yNy43MTIsNy45MjEtMzMuNjIzYzAuMTc0LTAuMTA1LDAuMzAxLTAuMjY0LDAuNDQyLTAuMzk2ICAgIGM3LjczNi0yLjQ3NCwxMy4wODQtNS45NDMsOC44ODEtMTAuNjE1bC03LjkzMi0yLjM5NWM1LjI5LTMuMTksMTMuMjM2LTExLjUyNywxNC40ODEtMzMuMTgzICAgIGMwLjg1OS0xNC44OTYtMy4wMjctMjMuNjItNy41MjUtMjguNzU2bDE1LjY3OC0zLjc5NEMzMzIuOTQ5LDEyOC41NjksMzQ1LjE0NiwxMjUuNDIxLDMxMS4xNzUsMTE1Ljc3NXogTTE1OC41MzMsMTE1LjM1NCAgICBsMzAuNjg4LTYuMzA3bDEwMy43MDgtMjEuMzEybDE1LjQ1MS0zLjE3OGMtNC45MzcsOS4wMzYtNC43MywyMS40MDItMy45MTMsMjkuMzVjMC4xNzksMS43OTgsMC4zODUsMy40NCwwLjU4NSw0LjY4OCAgICBMMjg4LjE0LDEyMi44bC0xMzAuODk3LDMyLjU2M0wxNTguNTMzLDExNS4zNTR6IE0yNi43MSwxNDcuMzM3bDE1LjQ0OSwzLjE3OGw5OS41OTcsMjAuNDc0bDguNzAxLDEuNzgybDAsMGwwLDBsMjYuMDkzLDUuMzYzICAgIGwxLjI4Nyw0MC4wMUw0My4zMDMsMTg0LjY3M2wtMTMuMjYzLTMuMjk2YzAuMTk1LTEuMjUsMC40MDEtMi44OSwwLjU4OC00LjY5M0MzMS40NCwxNjguNzQyLDMxLjY1MSwxNTYuMzczLDI2LjcxLDE0Ny4zMzd6ICAgICBNMjAuNzA4LDk2Ljc1N2MtMC4xODctOC43NDMsMS4zNzEtMTUuMDY2LDQuNTItMTguMjhjMi4wMDQtMi4wNTIsNC4zNjktMi40NzksNS45OTEtMi40NzljMC44NTcsMCwxLjQ3NCwwLjExOSwxLjUxNiwwLjExOSAgICBsNzkuNjA3LDI1Ljk1M2wzOS43MTcsMTIuOTQ5bC0xLjMwMyw0MC4yODlMMzkuMzM0LDEyNC4wN2wtNS44OC0xLjY0N2MtMC4yMTYtMC4wNjEtMC41MDktMC4xMDMtMC43MzUtMC4xMTMgICAgQzMyLjI2LDEyMi4yNzcsMjEuMjQ0LDEyMS4yNjMsMjAuNzA4LDk2Ljc1N3ogTTE0MC41NzksMjgwLjg2NkwyMy4yOCwyNDcuOThjLTAuMjE3LTAuMDYzLTAuNTA3LTAuMTA1LTAuNzMzLTAuMTE2ICAgIGMtMC40NjctMC4wMzEtMTEuNDg4LTEuMDQ0LTEyLjAyMS0yNS41NDRjLTAuMTktOC43NTQsMS4zNzYtMTUuMDcxLDQuNTE5LTE4LjI4OGMyLjAwOS0yLjA1Miw0LjM3NS0yLjQ3OSw1Ljk5NC0yLjQ3OSAgICBjMC44NTksMCwxLjQ3NCwwLjExNSwxLjUxOSwwLjExNWMwLDAsMC4wMDUsMCwwLDBsMTE5LjMxNiwzOC45MDhMMTQwLjU3OSwyODAuODY2eiBNMjk0LjI4NCwyMzkuNDU5ICAgIGMwLjE4NSwxLjgwNCwwLjM5MSwzLjQ0MywwLjU5MSw0LjY5M2wtMTQ3LjgxMiwzNi43NzFsMS4yOTItNDAuMDFsMzEuNjAxLTYuNDk3bDQuNjY3LDEuMTI5bDE3LjQ5Mi01LjY4NWw4MC42MzEtMTYuNTY5ICAgIGwxNS40NTctMy4xOEMyOTMuMjYxLDIxOS4xNDYsMjkzLjQ2NiwyMzEuNTE3LDI5NC4yODQsMjM5LjQ1OXogTTMwMi40MjYsMTg1LjA4NGMtMC4yNjksMC4wMDYtMC41MzgsMC4wNDItMC43OTEsMC4xMjIgICAgbC0xMS4xNDgsMy4xMjFsLTEwNi4xNDgsMjkuNzY0bC0xLjI5OC00MC4yODlsMzQuODI2LTExLjM1OWw4NC4zMjctMjcuNTAxYzAuMDExLTAuMDA1LDQuNDM2LTAuOTg4LDcuNjg0LDIuMzE1ICAgIGMzLjE0NCwzLjIxNCw0LjcwNCw5LjUzNyw0LjUyLDE4LjI4QzMxMy44NDgsMTg0LjAzNSwzMDIuODI3LDE4NS4wNTMsMzAyLjQyNiwxODUuMDg0eiIgZmlsbD0iI2Y2OTgyNyIvPgoJPC9nPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+Cjwvc3ZnPgo=";

const list = ["{124, 'test', }"]


const userList =  [
  {
    id: 'AIXZKN4ACSKI', lastName: 'Dobalina', firstName: 'Bob'
  },
  {
    id: 'A1L5P841VIO02V', lastName: 'McGee', firstName: 'Me & Bobby'
  },
  {
    id: 'AB2W04NI4OEAD', lastName: 'Goode', firstName: 'Johnny B.'
  },
  {
    id: 'A148SVSWKTJKU6', lastName: 'Rigby', firstName: 'Eleanor '
  },
  {
    id: 'AAAWJ6LW9WMOO', lastName: 'Miss Molly', firstName: 'Good Golly'
  }];

interface AppProps {
  history: any;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;  
}

interface AppState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  users: User[];
  selectedUser: User | undefined;
  userSelectedName : string | undefined;
  
}


class App extends React.Component<RouteComponentProps<AppProps>,AppState>{
  constructor(props:RouteComponentProps<AppProps>){

    super(props);
  
    this.state = {
      isAuthenticated: false,
      isAuthenticating: true,
      users:userList,
      selectedUser : undefined,
      userSelectedName : undefined,
      
    };

    document.title = "The All Store"
  }

  // async componentWillMount(){
    
  // }
  
  async componentDidMount() {
   /* try {
      if (await Auth.currentSession()) {
        this.userHasAuthenticated(true);
      }
    }
    catch(e) {
      if (e !== 'No current user') {
        alert(e);
      }
    }*/
    const values = queryString.parse(this.props.location.search);

    if (values != null && values.uid != null)
    {
      this.handleUserSelectChange(values.uid);    
      
    }
    this.setState({ isAuthenticating: false});   
  }

  userHasAuthenticated = (authenticated: boolean) => {
    this.setState({ isAuthenticated: authenticated});
  }

  handleLogout = async () => {
   // await Auth.signOut();
  
    this.userHasAuthenticated(false);
  //  this.props.history.push("/login");
  }

  showLoggedInBar = () => (
    <Fragment>
      
    </Fragment>
  );

  showLoggedOutBar = () => (
    <Fragment>
    
     
    </Fragment>
  );

  handleUserSelectChange(userId : any){
    // Use cast to any works but is not type safe
   var user = this.state.users.find(u => u.id == userId);
   if (user != null)
   {
     if (user.firstName != null)
     {
      this.setState({userSelectedName : user?.firstName + ' ' + user?.lastName}); 
     }
    
   }
 
   this.setState({ selectedUser : user});
 };

renderSelectOptions() {
    return this.state.users.map((dt, i) => {
     //console.log(dt);
      return (
          <MenuItem value={dt.id} key={i}>
            {dt.firstName} {dt.lastName} 
           </MenuItem>
      );
    });
   }

  render() {
    const childProps = {
      isAuthenticated: this.state.isAuthenticated,
      userHasAuthenticated: this.userHasAuthenticated
    };
  
    return (
      
      <div className="App container">
        <Navbar fluid collapseOnSelect>
          <Navbar.Header>
            <Navbar.Brand>
              <Link to="/">
                <span className="orange"> <img  src="../img/shop.png" alt="bookstore" />The All Store - Great Prices, Huge Collection</span>
              </Link>
            </Navbar.Brand>
            <Navbar.Toggle />
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav pullRight>
              {this.state.isAuthenticated ? this.showLoggedInBar() : this.showLoggedOutBar()}
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Router>
          <div>
            <Switch>
              <Route exact path="/">
              <Select value={this.state.userSelectedName} onChange={(e: React.ChangeEvent<{ value: any }>) => this.handleUserSelectChange(e.target.value)} >
                    {this.renderSelectOptions()}
                </Select>                
                <SearchBar userId={this.state.selectedUser?.id} searchid={undefined}></SearchBar>
              <RecommendationList mode='Normal' userId={this.state.selectedUser?.id}></RecommendationList>
              </Route>
              
             <Route path="/product/:id">
             <Input value={this.state.userSelectedName}></Input>
             <ProductDetail uid={this.state.selectedUser?.id} id={"2"}></ProductDetail>               

             </Route>
             <Route exact path="/search/:searchid"  >
             <Select value={this.state.selectedUser?.firstName} onChange={(e: React.ChangeEvent<{ value: any }>) => this.handleUserSelectChange(e.target.value)} >
                    {this.renderSelectOptions()}
                </Select>
                  
              <SearchBar userId={this.state.selectedUser?.id} searchid={undefined}></SearchBar>
              <RecommendationList mode='Normal' userId={this.state.selectedUser?.id}></RecommendationList>

             </Route>
             <Route exact path="/search">
             <Select value={this.state.selectedUser?.firstName} onChange={(e: React.ChangeEvent<{ value: any }>) => this.handleUserSelectChange(e.target.value)} >
                    {this.renderSelectOptions()}
             </Select> 
               
             <SearchBar userId={this.state.selectedUser?.id} searchid={undefined}></SearchBar>
              <RecommendationList mode='Normal' userId={this.state.selectedUser?.id} ></RecommendationList>
             </Route>
              <Route path="*" component={notFound} />
            </Switch>
          </div>
        </Router>
       
      </div>
     
    );
  }
}

export default withRouter(App as any);