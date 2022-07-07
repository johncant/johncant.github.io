#John's self-hosting page

#Intro and background

I started using Linux in 2007 after trying Windows Vista for a term at uni. The last straw was waiting 20s for the start menu to appear, so I switched to Linux and never looked back. Within a year I was using the Compiz Fusion desktop cube, and enjoying life on GNOME 2 on Ubuntu. I tried KDE for a while (and liked it) before moving back to GNOME. Eventually, I switched to Arch Linux with xfce after this https://news.ycombinator.com/item?id=4886747 and a recommendation from a friend. I still use Arch on my personal laptop. Becoming a professional full stack web dev (briefly), then a data scientist, while sometimes having to do my own data engineering and devops, I learned enough to put together a reasonably good self hosted environment.

I started self-hosting a while back when I realised:
  - Awesome software like Owncloud and pi-hole existed
  - Google adding "features" like backups and sync to Android. Very useful, but giving Google my data is not acceptable
  - Alexa becoming popular - cool tech, but the idea of allowing Jeff Bezos to eavesdrop on your conversations is pretty abhorrent. Mycroft looks pretty awesome - I would run it without having to connect to their servers.
  - Reading HN for ~10y, there are lots of companies out there doing useful things. Firstly, subscribing to all of these will bankrupt you pretty quickly, and secondly, most die fairly quicky (https://ourincrediblejourney.tumblr.com/) or get bought out by VCs and are forced to become more anti-consumer to generate ROI.
  - The UK passed a law allowing the govt to backdoor any device made in the UK and require any ISP to record your browsing history in real time
  - No-one in my house would be willing to put technical effort in to avoid mass surveillance
  - I wouldn't trust a VPN company's app to be installed on each of my devices and don't expect anyone else to
  - Eventually, I'd want to get away from Gmail and Facebook

It's worth mentioning that I don't really enjoy constantly fixing a load of broken self-hosted stuff. The solution to this is to put the time in to work on reliability, automation, and security. It's quite enjoyable to maintain a bunch of stuff that works.

#Journey

  - 2015-16: Used rpis as a wifi router + vpn tunnel
  - 2015: I started self hosting using rpis
  - 2018: My hard disk failed that I kept everything on. Lesson: Use RAID or have off-site backups
  - 2019: Started automating the setup with Ansible and adding more Pis and making everything more reliable
  - 2020: Early lockdown project: Automated plant watering
  - 2022: Self hosted setup massively accelerated due to Ansible and some refactoring

#Advice on how to start self-hosting

## 1. If you're new to self-hosting or linux, just set something simple up manually

If you aren't experienced, then overcomplicating your self-hosting environment might put you off before you actually get anything working. Just setting something up manually will allow you to find out whether or not self-hosting is valuable for you before committing too much time to it.

## 2. Focus on reliability, but understand what it means in your context

Software reliability is hard, and this is why SREs earn quite a lot of money. At large scale, to prevent downtime, I imagine people focus a lot on architecture, avoiding single point of failures and testing to simulate failure cases, i.e. netflix's chaosmonkey.

In a self-hosted environment, it means something quite different.
  - You aren't paid to maintain system reliability
  - No-one will help you solve problems
  - The bar for uptime is a lot lower.
  - Downtime wastes your time but doesn't result in panic
  - Small scale means you avoid problems associated with large scale but it causes other problems
  - Over time, you forget how things were set up. Automate your setup so you can redeploy quickly in the event of disaster, otherwise the downtime will expand until your next free weekend.
  - Self hosting more things exponentially decreases reliability, time spent fixing things, and the attack surface. This increases the bar for reliability.
  - Rather than avoiding downtime, it's better to focus on recovering from downtime quickly and effortlessly

## 3. Build from a solid foundation

### Network
My home network uses raspberry pis. The rpi4 has a gigabit ethernet adaptor and 2x USB3 ports plus wifi. I bought a load of USB3-1gb ethernet adaptors and used them to build by network. Before intalling any web services, I went through quite a lot of effort to make sure all the rpis could be plugged into eachother and "just work" and all network config would definitely surive a reboot or things being unplugged.

With any given rpi and some "other device" plugged into it, given any of these scenarios:
  - 1. Reboot
  - 2. Unplug the ethernet cable from the pi and plug it back in
  - 3. Unplug the ethernet cable from "other device" and plug it back in
  - 4. Unplug the usb-eth adaptor from the rpi and plug it back in
  - 5. Unplug the usb-eth adaptor from the pi, reboot, then plug it back in
then it should recover without human intervention.

Sometimes it becomes necessary to dynamically reconfigure the network, i.e. borrow parts. Having all the rpis set up for hotplugging makes recovery from this a lot easier.

### Disks
Avoid data loss in the event of a hard disk failure by using RAID (or something equivalent)

### Restart things using monit
This is Ok, but I try and only use this as a last resort. I would be concerned that some failure scenario could result in some sort of destructive reboot loop that might be hard to debug and you might not notice for a long time.

### Performance
If the performance of one of your services isn't good enough, take the time to fix it, or you won't want to use it for real.

## 4. Define all your infrastructure and config as code, and store it in version control

Ansible seems to be really popular for self hosting and is great for setting up machines

Terraform is also good but seems more suited towards cloud infrastructure

## 5. Take the time to pay back technical debt

Tech debt is what results when you take hacky shortcuts to get things done quickly.

After you get something new working, take the time to lock down your home network's security, make it reliable, and refactor your config to make deployment repeatable.

A well engineered config and a well engineered system is a joy to work with and speeds up "delivery". The benefits are easy to see on a home network. For example, I got a nice simple and reliable cookie-cutter approach working for nginx and letsencrypt for ansible, which makes it easy to add SSL termination to any service I set up.

## 6. Monitoring

Your setup can't be reliable if you don't know when it goes down. I monitor all services and also have a simple flask service to monitor my backups

## 7. Containerization

This helps you avoid stupidly complex system setups. It's difficult for anything complex to be secure or reliable.

# Awesome self-hosted stuff

https://github.com/awesome-selfhosted/awesome-selfhosted
https://selfhosted.show/

  - uptime-kuma
  - nextcloud
  - openvpn
  - openmediavault
