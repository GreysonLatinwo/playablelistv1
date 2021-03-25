import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image, Button, ImageBackground} from "react-native";
import './global';

const PlayableJson = require('./PlayableList.json');
const Web3 = require('web3');
const { ethers } = require("ethers");
var provider;
var signer; //signer is the address on the metamask account
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
    setModalVisible(visible) {
        this.setState({ modalVisible: visible });
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
                ugc-image-upload
                user-read-currently-playing`;
        const redirect_uri = window.location.origin;
        const url = `https://accounts.spotify.com/authorize?response_type=token&client_id=${my_client_id}&redirect_uri=${(redirect_uri)}&scope=${encodeURIComponent(scopes)}`
        window.location.href = url;
    }
    spotifySDKCallback = () => {
        window.onSpotifyWebPlaybackSDKReady = () => {
            const token = this.getCookie('spotifyToken');
            const spotifyPlayer = new Spotify.Player({
                name: 'Playable v2',
                getOAuthToken: cb => { cb(token); }
            });
            
            spotifyPlayer.addListener('player_state_changed', state => {
                console.log(state);
                var currentSong = null
                if(state){
                    currentSong = {
                        title: state.track_window.current_track.name,
                        artist: state.track_window.current_track.artists[0].name,
                        image: state.track_window.current_track.album.images[2].url,
                    }
                }

                //do things when the state changes
                
                this.setState({currentSong})
            });
            // add event listeners to the player
            this.setState({spotifyPlayer});
            spotifyPlayer.connect()
        }
    }
    updatePlaylist(){
        playableContract.GetAll('0xA54B25a1EA558512DEF1adD7b2b301c16051C065')
        .then((result) => {
            var JsonResult = JSON.parse(result);
            JsonResult.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
            this.state.playlist = JsonResult;
            this.setState(JsonResult);
            console.log(this.state.playlist);
        });
    }
    updateSpotify(){
        playableContract.GetAll(this.getCookie('PlaylistAddress'))
        .then((result) => {
            var JSONResults = JSON.parse(result);
            JSONResults.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
            var tracks2add = `{"uris": [`;
            for (let index = 0; index < JSONResults.length; index++) {
                if (index == JSONResults.length - 1)
                tracks2add += `"${JSONResults[index].trackURI}"`;
                else
                tracks2add += `"${JSONResults[index].trackURI}", `;
            }
            tracks2add += `]}`;
            var JSONtracks2add = JSON.parse(tracks2add);
            fetch(`https://api.spotify.com/v1/playlists/${this.getCookie('spotifyPlaylistId')}/tracks`, {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + this.getCookie("spotifyToken")
                },
                body: tracks2add
            })
            .then((data) => {
                console.log(data);
            })
            .catch((error) => {
                console.warn(error);
            });
        });
    }
    constructor(props) {
        super(props);
        // Don't call this.setState() here!
        this.state = {
            playlist: [],
            accounts: [],
            playableAddress: '0xA54B25a1EA558512DEF1adD7b2b301c16051C065',
            addModalVisibility: false,
        };
        window.ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
            this.updatePlaylist();
        });
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        playableContract = new ethers.Contract(PlayableJson.networks['3'].address, PlayableJson.abi, signer);
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
        //initial playlist state
        this.updatePlaylist();
        fetch(`https://api.spotify.com/v1/me/playlists`, {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "Authorization": "Bearer " + this.getCookie("spotifyToken")
            }
        })
        .then((response) => response.json())
        .then((spotifyPlaylist) => {
            if(spotifyPlaylist.error){
                return;
            }
            console.log(spotifyPlaylist);
            var spotifyPlaylistIdCookie = this.getCookie('spotifyPlaylistId');
            const playablelistFunc = (playlist) => playlist.name == `Playable List - ${this.getCookie('PlaylistAddress')}`
            var idx = spotifyPlaylist.items.findIndex(playablelistFunc);
            if (spotifyPlaylistIdCookie == null || spotifyPlaylistIdCookie !== spotifyPlaylist.items[idx].id){
                this.setCookie('spotifyPlaylistId', spotifyPlaylist.items[idx].id, 3600);
            }
        });
        // playlist update listener
        playableContract.on(playableContract.filters.playlistAltered, (event) => {
            var spotifyPlaylistID = this.getCookie('spotifyPlaylistId');
            var JSONResults = this.state.playlist
            JSONResults.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
            switch (event.args.alterType) {
            case 'add':
                var playableTrackPosition = 0;
                console.log('adding to playlist');
                for (var i = 0; i < JSONResults.length; i++) {
                    if (JSONResults[i].trackURI == event.args.trackURI) {
                        playableTrackPosition = i;
                        break;
                    }
                }
                const spotifyplaylistURL = `https://api.spotify.com/v1/playlists/${spotifyPlaylistID}/tracks?position=${playableTrackPosition}`;
                fetch(spotifyplaylistURL, {
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        "Authorization": "Bearer " + this.getCookie("spotifyToken")
                    },
                    body: `{"uris": ["${event.args.trackURI}"]}`
                })
                .then((response) => response.json())
                .then((data) => {
                    console.log(data);
                })
                .catch((err) => {
                    console.log(err);
                    alert(err.responseJSON.error.message)
                });
                break;
            //Todo
            case 'remove':
                console.log('removing from playlist');
                const putData = `{"tracks":[{"uri": "${event.trackURI}"}]}`;
                const spotifyURL = (`https://api.spotify.com/v1/playlists/${spotifyPlaylistID}/tracks`);
                fetch(spotifyURL, {
                    method: "DELETE",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        "Authorization": "Bearer " + this.getCookie("spotifyToken")
                    },
                    body: putData
                })
                .then((response) => response.json())
                .then((data) => {
                    console.log(data);
                })
                .catch((err) => {
                    console.log(err);
                    alert(err.responseJSON.error.message)
                });
                break;
            //Todo
            case 'update':
                console.log('updating playlist');
                //get current track positions
                fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistID}/tracks`, {
                    method: "GET",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        "Authorization": "Bearer " + this.getCookie("spotifyToken")
                    }
                })
                .then((data) => {
                    console.log("Data:", data);
                    var spotifyTrackPosition = 0;
                    //find track in spotify list //TODO duplicate trackURI check
                    for(var i = 0; i < data.items.length; i++){
                        if(data.items[i].track.uri == event.returnValues.trackURI){
                            spotifyTrackPosition = i;
                            break;
                        }
                    }
                    fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistID}/tracks`, {
                        method: "PUT",
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            "Authorization": "Bearer " + this.getCookie("spotifyToken")
                        },
                        body: `{"range_start":${spotifyTrackPosition}, "insert_before":${playableTrackPosition}}`
                    })
                    .then((data) => {
                        console.log("Data: " + data);
                    })
                    .catch((err) => {
                        console.log(err);
                        alert(err.responseJSON.error.message)
                    })
                })
                .catch((err) => {
                    console.log(err);
                    alert(err.responseJSON.error.message)
                })
                break;
            }
            console.log(event);
            this.updateSpotify();
        });
    }
    componentDidMount(){
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        script.onload = this.spotifySDKCallback;
        document.body.appendChild(script);
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
            playableContract.AddSong(
                trackInfo['album']['uri'],
                trackInfo['album']['images'][0]['url'],
                trackInfo['track_number'],
                trackInfo['uri'],
                trackInfo['name'],
                trackInfo['artists'][0]['name'],
                '', '0xA54B25a1EA558512DEF1adD7b2b301c16051C065', {value: 4000})
                .then(result => {
                    console.log(result);
                });
        })
        .catch((error) => {
            console.error(error);
        });
    }
    SpotifyPlay(playlistIdx){
        fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT', 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "Authorization": "Bearer " + this.getCookie("spotifyToken")
            },
            body: `{\"context_uri\":\"spotify:playlist:${this.getCookie('spotifyPlaylistId')}\",\"offset\":{\"position\":${playlistIdx}},\"position_ms\":0}`,
        })
        .then((response) => response.json())
        .then((responseJson) => {
            console.log(responseJson);
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
                    onPress={() => {this.AddSong('skegee jid')}} 
                    title={'Add skegee jid'}
                    color="#841584"
                    />
                    {
                        this.state.currentSong &&
                        <View style={{borderWidth: 1, height: 320}}>
                            <ImageBackground
                                style={{resizeMode: 'cover', height: 320}}
                                source={{
                                    uri: this.state.currentSong.image,
                                }}> 
                                <View style={{backgroundColor: '#222', borderRadius: 20, opacity: 0.8}}>
                                    <Text style={styles.title}>
                                        {this.state.currentSong.title + '\n'}
                                        <Text style={styles.artist}>
                                            {this.state.currentSong.artist}
                                        </Text>
                                    </Text>
                                </View>
                            </ImageBackground>
                        </View>
                    }
                    {this.state.playlist.map(({ songID, trackName, albumImage, artist }, currIdx) => (
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
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
      },
      button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2
      },
      buttonOpen: {
        backgroundColor: "#F194FF",
      },
      buttonClose: {
        backgroundColor: "#2196F3",
      },
      textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
      },
      modalText: {
        marginBottom: 15,
        textAlign: "center"
      }
      ,
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