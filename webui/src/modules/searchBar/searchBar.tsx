import React from "react";
import "./searchBar.scss";
import { Redirect } from "react-router";
import {
  withRouter,
  RouteComponentProps
} from "react-router-dom";

interface SearchBarProps {
  searchid: string | undefined;
  userId: string | undefined;
}

interface SearchBarState {
  redirect: string | undefined;
  value: string;
}

class SearchBar extends React.Component<
  RouteComponentProps<SearchBarProps> & SearchBarProps,
  SearchBarState
> {
  constructor(props: RouteComponentProps<SearchBarProps> & SearchBarProps) {
    super(props);

    this.state = {
      redirect: undefined,
      value: this.props.match.params.searchid
        ? this.props.match.params.searchid
        : ""
      // uid : this.props.userId?this.props.userId: "",
    };

    console.log("UserId in constructor: " + this.props.userId);
  }

  // async componentDidMount() {
  //   this.setState({ uid: this.props.userId?this.props.userId: ""});
  //   console.log("UserId in componentDidMount: " + this.props.userId);
  // }

  handleChange = (event: React.ChangeEvent) => {
    const target = event.currentTarget as HTMLInputElement;
    this.setState({ value: target.value });
    console.log("UserId in handleChange: " + this.props.userId);
  };

  onSearch = () => {
    var buildRedirect = "";
    if (this.props.userId != null) {
      buildRedirect =
        "/search/" + this.state.value + "?uid=" + this.props.userId;
    } else {
      buildRedirect = `/search/${this.state.value}`;
    }
    this.setState({
      redirect: buildRedirect
    });
    console.log("RedirectURL in onSearch: " + buildRedirect);
    console.log("UserId in onSearch: " + this.props.userId);
  };

  render() {
    console.log("UserId in render: " + this.props.userId);

    return (
      <form className="searchform mainsearch">
          <div className="col-md-8 col-md-push-2">
            <div className="input-group">
              <div className="input-group-addon search-label">
                Search
              </div>
              <input
                type="text"
                className="form-control"
                id="txtSearch"
                value={this.state.value}
                onChange={this.handleChange}
              />
              <div className="input-group-btn">
                <button
                  className="btn btn-orange"
                  onClick={this.onSearch}
                >
                  <span className="glyphicon glyphicon-search"></span>
                </button>
                {this.state.redirect && <Redirect to={this.state.redirect} />}
              </div>
            </div>
          </div>
      </form>
    );
  }
}

export default withRouter(SearchBar);
