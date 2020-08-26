import React from "react";
import { Html5Entities } from "html-entities";
import "./storeItem.scss";

const htmlEntities = new Html5Entities();

interface ProductRowProps {
  productId: string;
  imUrl: string;
  title: string;
  uid: string | undefined;
}

export interface Product {
  asin: string;
  imUrl: string;
  price: number;
  category: string;
  title: string;
  rating: number;
}

interface ProductRowState {
  product: Product | undefined;
}

class ProductRow extends React.Component<ProductRowProps, ProductRowState> {
  constructor(props: ProductRowProps) {
    super(props);

    this.state = {
      product: undefined
    };
  }

  render() {
    return (
      <a href={`/product/${this.props.productId}?uid=${this.props.uid}`}>
        <div className="imgbox">
          <img
              alt={htmlEntities.decode(this.props.title)}
              src={this.props.imUrl}
              className="prod-img"
            ></img>
        </div>
        <div className="itemTitle">{htmlEntities.decode(this.props.title)}</div>
      </a>
    );
  }
}

export default ProductRow;
