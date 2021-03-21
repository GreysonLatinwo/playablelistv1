import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
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
        <TextInput
          style={styles.addressinput}
          onChangeText={this.updateAddress}
          value={this.state.playlistAddres}
          placeholder="Playlist Eth Address">
        </TextInput>
        <View style={styles.card}>
          <Playlist/>
        </View>
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
    borderRadius: 30
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
