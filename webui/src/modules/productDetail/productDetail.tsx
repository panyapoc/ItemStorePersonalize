import React from "react";
import AWS from "aws-sdk";
import { Product } from "../storeItem/storeItem";
import getConfig from "../../config";
import "./productDetail.css";
import queryString from "query-string";
import RecommendationList from "../recommendationList/recommendationList";
import {
  RouteComponentProps
} from "react-router-dom";
import { withRouter } from "react-router";
import { Html5Entities } from "html-entities";

const htmlEntities = new Html5Entities();

const configP = getConfig();
const kinesisP = configP.then((config) => {
  AWS.config.update({
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: config.cognito.AnonymousPoolId
    }),
    region: config.region,
  });
  return new AWS.Kinesis();
});

type ProductDetailsProp = {
  id: string;
  uid: string | undefined;
};

interface ProductDetailsState {
  isLoading: boolean;
  product: Product | undefined;
  description: string[] | undefined;
  showAMZNLink: boolean;
}

class ProductDetails extends React.Component<RouteComponentProps<ProductDetailsProp> & ProductDetailsProp,ProductDetailsState> {
  constructor(props: RouteComponentProps<ProductDetailsProp> & ProductDetailsProp) {
    super(props);
    this.state = {
      isLoading: true,
      product: undefined,
      description: undefined,
      showAMZNLink: false
    };
  }

  submitClickStreamData = async () => {
    const values = queryString.parse(this.props.location.search);

    try {
      const config = await configP;
      const params = {
        Data: JSON.stringify({
              userID: values.uid,
              itemID: this.props.match.params.id,
              sessionID: localStorage.getItem("SID"),
            }),
        PartitionKey: config.kinesis.PartitionKey, /* required */
        StreamName: config.kinesis.StreamName /* required */
      };
      console.table(params);

      const kinesis = await kinesisP;
      kinesis.putRecord(params, function(err, data) {
        if (err) {
          console.error(err, err.stack);
        } else {
          console.log(data);
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  async componentDidMount() {
    this.submitClickStreamData();

    const config = await configP;
    let productDetailsUrl =
      config.api.GetDetailsUrl + this.props.match.params.id;

    try {
      fetch(productDetailsUrl)
        .then(response => response.json())
        .then(data => {
          this.setState({ isLoading: false, product: data });
        });
    } catch (e) {
      this.setState({ isLoading: false });
      console.log(e);
    }

    try {
      let descriptionUrl = config.api.GetDescriptionForProduct + "?asin=" +this.props.match.params.id;

      fetch(descriptionUrl)
        .then(response => response.json())
        .then(data => {
          this.setState({
            showAMZNLink: data.Items.length > 0,
            description: data.Items
          });
        });
    } catch (e) {
      if (this.state.isLoading) this.setState({ isLoading: false });
      console.log(e);
    }
  }

  render() {
    if (this.state.isLoading)
      return (
        <div>
          <h1>Loading....</h1>
        </div>
      );
    else {
      const values = queryString.parse(this.props.location.search);
      const uid = values.uid;
      let item = this.state.product;
      if (item !== undefined) {
        let recommendedForUser;
        if (uid !== null) {
          recommendedForUser = (
            <div className="itemsForUser">
              <div>
                <h3>Recommended For You</h3>
              </div>
              <div>
                <RecommendationList
                  mode="ItemsForUser"
                  userId={uid?.toString()}
                ></RecommendationList>
              </div>
            </div>
          );
        }
        let amazonUrl = "https://www.amazon.com/dp/" + item.asin;

        const descData = this.state.description;

        let descriptionItems = descData?.map(d => <li key={d}>{d}</li>);
        let amazonLinkContent = this.state.showAMZNLink ? (
          <tr>
            <td></td>
            <td>
              <a target="_blank" href={amazonUrl} rel="noopener noreferrer">
                Buy it on Amazon.com
              </a>
            </td>
          </tr>
        ) : (
          <tr>
            <td></td>
          </tr>
        );

        return (
          <div>
            <table className="productDetail" key={item.asin}>
              <tbody>
                <tr>
                  <td>
                    <img src={item.imUrl}></img>
                  </td>
                  <td>
                    <b>{htmlEntities.decode(item.title)}</b>
                    <br />
                    <span className="productDetail">
                      <ul>{descriptionItems}</ul>
                    </span>
                  </td>
                </tr>
                {amazonLinkContent}
              </tbody>
            </table>
            <div className="similar">
              <div>
                <h3>Similar Items</h3>
              </div>
              <div>
                  <RecommendationList
                  mode="SimilarItems"
                  userId={uid?.toString()}
                  productId={item.asin}
                  ></RecommendationList>
              </div>
            </div>
            {recommendedForUser}
          </div>
        );
      } else
        return (
          <div>
            <h1>Could not load product.</h1>
          </div>
        );
    }
  }
}

export default withRouter(ProductDetails);
