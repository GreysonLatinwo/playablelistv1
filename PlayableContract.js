import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image, Button } from "react-native";
import './global';

const PlayableJson = require('./PlayableList.json');
const Web3 = require('web3');
var playableContract;
class Playlist extends React.Component {
    
    getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
      
    setCookie(cname, cvalue, seconds) {
        var d = new Date();
        d.setTime(d.getTime() + (seconds * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
    spotifyAuth() {
        const my_client_id = '9c51eed9e4534dc3b3711c58b43c13c9';
        const scopes = `playlist-read-collaborative 
                playlist-read-private 
                playlist-modify-private 
                playlist-modify-public 
                streaming 
                user-read-email 
                user-read-private 
                user-modify-playback-state
                user-read-playback-state
                ugc-image-upload`;
        const redirect_uri = window.location.origin;
        const url = `https://accounts.spotify.com/authorize?response_type=token&client_id=${my_client_id}&redirect_uri=${(redirect_uri)}&scope=${encodeURIComponent(scopes)}`
        window.location.href = url;
    }
    constructor(props) {
        super(props);
        // Don't call this.setState() here!
        this.state = {
            playlist: [],
            accounts: [],
            playableAddress: '0xA54B25a1EA558512DEF1adD7b2b301c16051C065'
        };
        ethereum.request({ method: 'eth_requestAccounts' })
        .then((responseAccount) => {
            this.state.accounts = responseAccount
        });
        this.setCookie('PlaylistAddress', '0xA54B25a1EA558512DEF1adD7b2b301c16051C065', 3600)
        if (!window.location.hash){
            this.spotifyAuth();
        }else{
            const urlParams = window.location.hash.split('&');
            if(urlParams.length >= 3)
                this.setCookie('spotifyToken', urlParams[0].split('=')[1], urlParams[2].split('=')[1])
        }
    }
    componentWillMount() {
        const web3 = new Web3(
            new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/466820daa9c0476985e1444bb1ced01d')
        );
        playableContract = new web3.eth.Contract(PlayableJson.abi, PlayableJson.networks['3'].address);
        playableContract.methods.GetAll('0xA54B25a1EA558512DEF1adD7b2b301c16051C065').call().then((result) => {
            var JsonResult = JSON.parse(result);
            JsonResult.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
            this.state.playlist = JsonResult;
            this.setState(JsonResult)
            console.log(this.state.playlist);
        });
    }
    AddSong(searchValue){
        var searchLimit = 5;
        const spotifysearchURL = ("https://api.spotify.com/v1/search?q=" + encodeURIComponent(searchValue) + "&type=track&limit=" + searchLimit);
        fetch(spotifysearchURL, {
            method: 'GET', 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "Authorization": "Bearer " + this.getCookie("spotifyToken")
            },
        })
        .then((response) => response.json())
        .then((searchResults) => {
            console.log(searchResults);
            let trackInfo = searchResults['tracks']["items"][0];
            playableContract.methods.AddSong(
                trackInfo['album']['uri'],
                trackInfo['album']['images'][0]['url'],
                trackInfo['track_number'],
                trackInfo['uri'],
                trackInfo['name'],
                trackInfo['artists'][0]['name'],
                '', '0xA54B25a1EA558512DEF1adD7b2b301c16051C065')
            .send({ from: this.state.accounts[0], value: 1000})
        })
        .catch((error) => {
            console.error(error);
        });
        
    }
    SpotifyPlay(playlistIdx){
        const spotifyPlaylistID = 'spotify:playlist:5isvshO0NjjLLsc4AOJnTY';
        console.log(JSON.stringify({
            'context_uri': 'spotify:playlist:5isvshO0NjjLLsc4AOJnTY',
            'offset':{'position': `${this.state.playlist[playlistIdx]['trackIndex']}`},
            'position_ms': '0'
        }));
        fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT', 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "Authorization": "Bearer " + this.getCookie("spotifyToken")
            },
            body: `{\"context_uri\":\"spotify:playlist:5isvshO0NjjLLsc4AOJnTY\",\"offset\":{\"position\":${playlistIdx}},\"position_ms\":0}`,
        })
        .then((response) => response.json())
        .then((responseJson) => {
            responseJson
        })
        .catch((error) => {
            console.warn(error);
        });
    }
    render() {
        return (
            <React.Fragment>
                <View style={styles.container}>
                    <Button 
                    onPress={() => {this.AddSong('Ziplock saba')}} 
                    title={'Add \"Ziplock\" By Saba'}
                    color="#841584"
                    />
                    {this.state.playlist.map(({ songID, trackName, trackURI, albumImage, artist }, currIdx) => (
                        <React.Fragment key={songID}>
                            
                            <TouchableOpacity
                                accessibilityRole={'button'}
                                style={styles.linkContainer}
                                onPress={() => this.SpotifyPlay(currIdx)}>
                                <Image
                                    style={styles.tinyLogo}
                                    source={{
                                        uri: albumImage,
                                    }}
                                />
                                <Text style={styles.title}>{trackName + '\n'}
                                    <Text style={styles.artist}>
                                        {artist}
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.separator} />
                        </React.Fragment>
                    ))}
                </View>
            </React.Fragment>
        );
    }
}
const styles = StyleSheet.create({
    container: {
        marginTop: 32,
        paddingHorizontal: 24,
        backgroundColor: "#223",
    },
    tinyLogo: {
        width: 50,
        height: 50,
    },
    linkContainer: {
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    link: {
        flex: 2,
        fontSize: 18,
        fontWeight: '400',
        color: '#7700ff',
    },
    title: {
        flex: 3,
        paddingVertical: 12,
        fontWeight: '400',
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
    },
    artist: {
        flex: 3,
        paddingVertical: 16,
        fontWeight: '400',
        fontSize: 12,
        color: '#aaaaaa',
        textAlign: 'center',
    },
    separator: {
        backgroundColor: '#eeeeee',
        height: 1,
    },
});
export default Playlist;