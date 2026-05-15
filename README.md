# This is Posting Simulator Many Groups for facebook

If you need script watch change to build a one file script (Ex: content.js), run command

```bash
npx esbuild dist/content/content-src.js --bundle --outfile=dist/content/content.js --watch
npx esbuild dist/utils/gm-compat-src.js --bundle --outfile=dist/utils/gm-compat.js --watch
```

# How to install, update quickly and easier later

## Step 1: Install git in your computer if you haven't installed it yet

```bash
    # Window will using winget to install
    # check if winget is installed
    winget --version

    # if winget is not installed, install it
    # install git
    winget install --id Git.Git -e --source winget

    # Linux will using apt to install
    sudo apt update
    sudo apt install git -y

    #check if git is installed
    git --version

    # Config email and user name
    git config --global user.name "Your Name"
    git config --global user.email "your-email@example.com"

    #check config
    git config --list
```

## Step 2: Clone this repository (if repository is private, you need to use SSH-KEY to clone this repository, if public, you can use HTTPS)

```bash
    # You need use SSH-KEY to clone this repository, follow this
    ssh-keygen -t ed25519 -C "[EMAIL_ADDRESS]"

    # Copy the key
    # Using linux
    cat ~/.ssh/id_ed25519.pub
    # Using window
    type %USERPROFILE%\.ssh\id_ed25519.pub

    # Copy that string and send to me
    # After you send the key to me, I will add it to the repository

    # Clone use SSH link
    git clone git@github.com:User/name-repo.git

```

## Step 4: How to install extension to browser

- Open extension page [chrome://extensions/](chrome://extensions/)
- Enable developer mode (top right)
- Click Load unpacked button
- Select folder `dist` that you just have cloned from github

## How to update quickly later

- Open command line prompt in folder `dist` that you just have cloned from github
  - Using window, you can type `cmd` in the address bar of folder and press `Enter`
  - Using linux, you can type `Ctrl + Alt + T` in the folder and press `Enter`
- Pull change from github

```bash
# path will be looked like this ../extention_chrome_fb_posting

# pull change from github
git pull
```

- Reload extension in [chrome://extensions/](chrome://extensions/)
