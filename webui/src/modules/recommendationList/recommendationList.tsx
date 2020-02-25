import React from "react";
import PropTypes from "prop-types";
import ProductRow from "../storeItem/storeItem";
import { Product } from "../storeItem/storeItem";
import config from "../../config";
import { Table } from "@material-ui/core";
import { uid } from "react-uid";
import "./recommendationList.css";

import {
  BrowserRouter as Router,
  Switch,
  Route,
  withRouter,
  Link,
  RouteComponentProps
} from "react-router-dom";
import { Col } from "react-bootstrap";

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
      userId: props.userId ?? config.user.id,
      isLoading: true,
      items: [],
      mode: RecommendationMode.Normal
    };
  }

  _loadAsyncData() {
    let fetchLess = false;

    let getUrl = config.api.GetListUrl;

    if (this.props.mode == RecommendationMode.Normal) {
      if (
        this.props.match.params.searchid &&
        this.props.match.params.searchid.length > 0
      ) {
        getUrl = config.api.SearchUrl + "?";

        let queryString = "";

        queryString += "q=" + this.props.match.params.searchid;

        if (this.props.userId) {
          if (queryString != "") queryString += "&";

          queryString += "u=" + this.props.userId;
        }

        if (queryString != "") getUrl = getUrl + queryString;
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
        if (!fetchLess)
          this.setState({ isLoading: false, items: data.slice() });
        else this.setState({ isLoading: false, items: data.slice(0, 10) });
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
    let listItems = this.state.items;
    let userid = this.props.userId;
    let productcat: JSX.Element[] = [];

    try {
      listItems.forEach(function(item, index) {
        productcat.push(
            <Col xs={6} md={4} className="product">
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


    // if (listItems != null) {
    //   for (let i = 0; i < listItems.length; i++) {
    //     let product = listItems[i];
    //     children.push(
    //       <td key={product.asin}>
    //         {" "}
    //         <ProductRow
    //           uid={this.props.userId}
    //           key={product.asin}
    //           title={product.title}
    //           imUrl={product.imUrl}
    //           productId={product.asin}
    //         ></ProductRow>
    //       </td>
    //     );
    //     ++currentCol;
    //     if (currentCol >= maxCols) {
    //       table.push(<tr key={uid(product)}>{children}</tr>);
    //       children = [];
    //       currentCol = 0;
    //     }
    //   }
    //   if (children.length > 0) {
    //     table.push(<tr key={uid(Date.now())}>{children}</tr>);
    //     children = [];
    //   }
    // }

    return productcat;
  };

  render() {
    let currentClassName;

    if (this.props.mode == RecommendationMode.Normal)
      currentClassName = "recommend";
    else if (this.props.mode == RecommendationMode.SimilarItems)
      currentClassName = "similar";
    else currentClassName = "itemsForUser";

    return (
      <div className={currentClassName}>
        {this.createTable()}
      </div>
    );
  }
}

export default withRouter(RecommendationList);
