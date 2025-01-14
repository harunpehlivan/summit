const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

const dataURLs = {
    'local': '../',
    'github': 'https://raw.githubusercontent.com/fredhohman/summit-data/master/'
}

module.exports = env => {

    console.log('ENV', env.dataURL)

    return {
        entry: './js/index.js',
        output: {
            filename: './dist/bundle.js'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader"
                    }
                },
                {
                    test: /\.html$/,
                    use: [
                        {
                            loader: "html-loader",
                            options: { minimize: false }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader"]
                },
                {
                    test: /\.(png|svg|jpg|gif)$/,
                    use: [
                        'file-loader'
                    ]
                }
            ],
        },
        plugins: [
            new HtmlWebPackPlugin({
                template: "./index.html", // original location
                filename: "./index.html"  // output in dist
            }),
            new MiniCssExtractPlugin({
                filename: "[name].css",
                chunkFilename: "[id].css"
            }),
            // new CopyWebpackPlugin([
            //     {
            //         from: path.join(__dirname, 'data'),
            //         to: path.join(__dirname, 'dist') + '/data'
            //     }
            // ]),
            new webpack.DefinePlugin({
                dataURL: JSON.stringify(dataURLs[env.dataURL])
            })
        ],
        devServer: {
            contentBase: path.join(__dirname, 'dist'),
            compress: false,
            port: 9000
        }
    };
}