import React from "react";
import ProductRow from "../storeItem/storeItem";
import { Product } from "../storeItem/storeItem";
import getConfig from "../../config";
import "./recommendationList.css";

import {
  withRouter,
  RouteComponentProps
} from "react-router-dom";
import { Col } from "react-bootstrap";

const configP = getConfig();

const RecommendationMode = {
  Normal: "Normal",
  SimilarItems: "SimilarItems",
  ItemsForUser: "ItemsForUser"
};

export interface RecommendationListProps {
  userId?: string | undefined;
  searchid?: string | undefined;
  mode: string;
  productId?: string | undefined;
}

interface RecommendationListState {
  userId?: string | undefined;
  isLoading: boolean;
  items: Product[];
  mode: string;
  warning: string | undefined;
}

export class RecommendationList extends React.Component<
  RouteComponentProps<RecommendationListProps> & RecommendationListProps,
  RecommendationListState
> {
  constructor(
    props: RouteComponentProps<RecommendationListProps> &
      RecommendationListProps
  ) {
    super(props);

    this.state = {
      userId: props.userId,
      isLoading: true,
      items: [],
      mode: RecommendationMode.Normal,
      warning: undefined,
    };

    configP.then(config => {
      if (config.user.id && !this.props.userId) this.setState({ userId: config.user.id });
    });
  }

  async _loadAsyncData() {
    let fetchLess = false;

    const config = await configP;

    let getUrl = config.api.GetListUrl;

    if (this.props.mode === RecommendationMode.Normal) {
      if (
        this.props.match.params.searchid &&
        this.props.match.params.searchid.length > 0
      ) {
        getUrl = config.api.SearchUrl + "?";

        let queryString = "";

        queryString += "q=" + this.props.match.params.searchid;

        if (this.props.userId) {
          if (queryString !== "") queryString += "&";

          queryString += "u=" + this.props.userId;
        }

        if (queryString !== "") getUrl = getUrl + queryString;
      } else {
        if (this.props.userId != null) getUrl += this.props.userId;
      }
    } else {
      fetchLess = true;
      if (this.props.productId) {
        getUrl = config.api.RecommendSimilar + this.props.productId;
      } else {
        if (this.props.userId) {
          getUrl += this.props.userId;
        }
      }
    }

    // Get the data
    fetch(getUrl)
      .then(response => response.json())
      .then(data => {
        const results = data?.results || [];
        this.setState({
          isLoading: false,
          items: fetchLess ? results.slice(0, 10) : results.slice(),
          warning: data?.warning,
        });
      });
  }

  static getDerivedStateFromProps(
    newProps: RouteComponentProps<RecommendationListProps> &
      RecommendationListProps,
    prevState: RecommendationListState
  ) {
    // Any time the current user changes,
    // Reset any parts of state that are tied to that user.
    // In this simple example, that's just the email.
    if (newProps.userId !== prevState.userId) {
      return {
        userId: newProps.userId,
        isLoading: false,
        items: null,
        mode: newProps.mode
      };
    }
    return null;
  }

  componentDidMount() {
    this.setState({ isLoading: true });
    this._loadAsyncData();
  }

  componentDidUpdate(
    prevProps: RouteComponentProps<RecommendationListProps> &
      RecommendationListProps,
    prevState: RecommendationListState
  ) {
    if (this.state.items === null) {
      this._loadAsyncData();
    }
  }

  createTable = () => {
    const listItems = this.state.items || [];
    let userid = this.props.userId;
    var xs: number ,md: number , lg : number,sm : number
    if (this.props.mode === RecommendationMode.Normal){
      xs = 12;
      sm = 6;
      md = 6;
      lg = 4;
    }
    else {
      xs = 12;
      sm = 6;
      md = 4;
      lg = 3;
    }
    let productcat: JSX.Element[] = [];

    try {
      listItems.forEach(function(item, index) {
        productcat.push(
            <Col xs={xs} sm={sm} md={md} lg={lg} className="product" key={index}>
              <ProductRow
                uid={userid}
                key={item.asin}
                title={item.title}
                imUrl={item.imUrl}
                productId={item.asin}
              ></ProductRow>
            </Col>
          );
      })
    }
    catch(e){
      console.log(e)
    }

    return productcat;
  };

  render() {
    let currentClassName;
    if (this.props.mode === RecommendationMode.Normal){
      currentClassName = "recommend";
      return (
        <div className={currentClassName}>
          {
            this.state.warning
              ? <div className="warning">
                <i className="glyphicon glyphicon-warning-sign"></i> {this.state.warning}
              </div>
              : null
          }
          {this.createTable()}
        </div>
      );
    }
    else if (this.props.mode === RecommendationMode.SimilarItems) {
      currentClassName = "similar";
      return (
        <div className={currentClassName}>
          {
            this.state.warning
              ? <div className="warning">
                <i className="glyphicon glyphicon-warning-sign"></i> {this.state.warning}
              </div>
              : null
          }
          <div className="container testimonial-group">
            <div className="row text-center">
              {this.createTable()}
            </div>
          </div>
        </div>
      );
    }
    else {
      currentClassName = "itemsForUser";
      return (
        <div className={currentClassName}>
          {
            this.state.warning
              ? <div className="warning">
                <i className="glyphicon glyphicon-warning-sign"></i> {this.state.warning}
              </div>
              : null
          }
          <div className="container testimonial-group">
            <div className="row text-center">
              {this.createTable()}
            </div>
          </div>
        </div>
      );
    }
  }
}

export default withRouter(RecommendationList);
