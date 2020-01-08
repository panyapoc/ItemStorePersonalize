import React from "react";
import { Html5Entities } from 'html-entities';
import "./storeItem.css";
  
const htmlEntities = new Html5Entities();


interface ProductRowProps {
    productId: string;
    imUrl: string;
    title:string;
    uid:string | undefined;
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
        product: undefined,
      };
    }

    render(){
        return(
            <a  target="_blank" rel="noopener noreferrer" href={`/product/${this.props.productId}?uid=${this.props.uid}`}>
            <span className="recommend"><div>
           <img alt={htmlEntities.decode(this.props.title)} src={this.props.imUrl}></img></div>
           <div>
            {htmlEntities.decode(this.props.title)}
            </div>
           
            </span>
            </a>
        )
    }

}

export default ProductRow;