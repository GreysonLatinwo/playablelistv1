import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Linking, Button } from "react-native";
import { SearchBar, Card } from 'react-native-elements';
import * as DevMenu from "expo-dev-menu";
import './global';
import Playlist from './PlayableContract.js'
import { TextInput } from "react-native-gesture-handler";

export default class App extends React.Component {
  state = {
    playlistAddres: '0xA54B25a1EA558512DEF1adD7b2b301c16051C065',
  };

  updateAddress = (address) => {
    this.setState({ playlistAddres: address });
  };
  
  render() {
    return (
      <View style={styles.container}>
        {
          (window.ethereum != null)
          ?
          <View>
            <Text style={styles.addressinput}>
              Playlist: {this.state.playlistAddres}
            </Text>
            <View style={styles.card}>
              <Playlist/>
            </View>
          </View>
          :
          <View>
            <Text style={{color: "#fff", textAlign: "center"}}>Please use a Web3 Provider (that Supports the ropsten testnet)</Text>
            <Text style={{color: "#fff", textAlign: "center"}}>i.e. Metamask or CoinBase Wallet</Text>
            <Button title='Metamask' style={{color: "#00f", textAlign: "center", fontSize: 18}} onPress={() => Linking.openURL('https://metamask.io')}/>
          </View>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#223",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    borderWidth: 1,
    color: "#fff"
  },
  addressinput: {
    color: "#ffffff",
    flex: 1,
    width: 'auto',
    fontSize: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    backgroundColor: "#4630eb",
    borderRadius: 4,
    padding: 12,
    marginVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 32,
  },
});
